use anyhow::Result;
use sqlx::{Connection, MySqlPool, Row};
use tracing::{error, info, warn};
use serde_json::{json, Value};
use std::collections::HashSet;

use crate::proxmox::{ProxmoxClient, VmType, PowerAction};
use super::create::{
    handle_create_task, handle_reinstall_task, is_transient_proxmox_resize_error,
    resize_retry_backoff_secs, send_vm_email,
};


static ACTIVE_VM_TASKS: once_cell::sync::Lazy<std::sync::Mutex<HashSet<String>>> =
    once_cell::sync::Lazy::new(|| std::sync::Mutex::new(HashSet::new()));
static VM_TASK_SLOTS: tokio::sync::Semaphore = tokio::sync::Semaphore::const_new(32);

struct ActiveVmTask(String);
impl Drop for ActiveVmTask {
    fn drop(&mut self) {
        if let Ok(mut active) = ACTIVE_VM_TASKS.lock() { active.remove(&self.0); }
    }
}

pub async fn process_vm_task(pool: &MySqlPool, task_id: &str, encryption_key: &str, debug_decrypt: bool) -> Result<()> {
    {
        let mut active = ACTIVE_VM_TASKS.lock().map_err(|_| anyhow::anyhow!("VM task registry unavailable"))?;
        if !active.insert(task_id.to_string()) { return Ok(()); }
    }
    let _active = ActiveVmTask(task_id.to_string());
    let _permit = VM_TASK_SLOTS.acquire().await?;
    // The connection owns this lock across awaits and across runner processes.
    let mut connection = sqlx::MySqlConnection::connect_with(pool.connect_options().as_ref()).await?;
    let lock_name = format!("fp-vm-{}", task_id);
    let acquired: Option<i32> = sqlx::query_scalar("SELECT GET_LOCK(?, 0)")
        .bind(&lock_name).fetch_one(&mut connection).await?;
    if acquired != Some(1) { return Ok(()); }
    // This dedicated connection closes and releases the lock if the future is aborted.
    let result = process_vm_task_inner(pool, task_id, encryption_key, debug_decrypt).await;
    let _ = sqlx::query("SELECT RELEASE_LOCK(?)").bind(&lock_name).execute(&mut connection).await;
    result
}

async fn process_vm_task_inner(pool: &MySqlPool, task_id: &str, encryption_key: &str, _debug_decrypt: bool) -> Result<()> {
    info!("🔄 Processing VM task: {}", task_id);

    // Main processing loop - keep checking until task is completed or failed
    loop {
        // Fetch the task
        let task_row = sqlx::query("SELECT * FROM featherpanel_vm_tasks WHERE task_id = ?")
            .bind(task_id)
            .fetch_optional(pool)
            .await?;

        let task = match task_row {
            Some(row) => row,
            None => {
                warn!("⚠️ VM task {} not found", task_id);
                return Ok(());
            }
        };

        let status: String = task.try_get("status").unwrap_or_default();
        
        // Exit if task is already completed or failed
        if status == "completed" || status == "failed" {
            info!("✅ Task {} is {}", task_id, status);
            return Ok(());
        }

        let vm_node_id: i32 = task.try_get("vm_node_id").unwrap_or(0);
        let task_type: String = task.try_get("task_type").unwrap_or_default();
        let upid: String = task.try_get("upid").unwrap_or_default();
        

        // Set status to running if it's pending
        if status == "pending" {
            sqlx::query("UPDATE featherpanel_vm_tasks SET status = 'running' WHERE task_id = ? AND status = 'pending'")
                .bind(task_id)
                .execute(pool)
                .await?;
            
        }

        if task_type == "backup" && !upid.is_empty() {
            let mut transaction = pool.begin().await?;
            let current = sqlx::query("SELECT data, status FROM featherpanel_vm_tasks WHERE task_id = ? FOR UPDATE")
                .bind(task_id).fetch_one(&mut *transaction).await?;
            let state: String = current.try_get("status")?;
            if state == "completed" || state == "failed" { return Ok(()); }
            let data: String = current.try_get("data")?;
            let mut current_meta: Value = serde_json::from_str(&data)?;
            if current_meta["backup_id"].as_i64().is_none() {
                let instance_id: i32 = task.try_get("instance_id")?;
                let vmid: i32 = task.try_get("vmid")?;
                let insert = sqlx::query("INSERT INTO featherpanel_vm_instance_backups (vm_instance_id, vmid, storage, volid, size_bytes, ctime, format, status) VALUES (?, ?, 'pending', 'pending', 0, UNIX_TIMESTAMP(), NULL, 'pending')")
                    .bind(instance_id).bind(vmid).execute(&mut *transaction).await?;
                current_meta["backup_id"] = json!(insert.last_insert_id());
                sqlx::query("UPDATE featherpanel_vm_tasks SET data = ? WHERE task_id = ?")
                    .bind(serde_json::to_string(&current_meta)?).bind(task_id).execute(&mut *transaction).await?;
            }
            transaction.commit().await?;
        }
        let current_data: String = sqlx::query_scalar("SELECT data FROM featherpanel_vm_tasks WHERE task_id = ?")
            .bind(task_id).fetch_one(pool).await?;
        let meta: Value = serde_json::from_str(&current_data).unwrap_or(json!({}));

        // If there's a UPID, check if the Proxmox task is still running
        if !upid.is_empty() {
            let target_node: String = task.try_get("target_node").unwrap_or_default();
            
            // Load node credentials to check task status
            let node_row = sqlx::query("SELECT * FROM featherpanel_vm_nodes WHERE id = ?")
                .bind(vm_node_id)
                .fetch_optional(pool)
                .await?;

            if let Some(node) = node_row {
                let client = build_proxmox_client(&node, encryption_key)?;
                
                match client.get_task_status(&target_node, &upid).await {
                    Ok(task_status) => {
                        if !task_status.is_stopped() {
                            info!("⏳ Task {} still running (UPID: {})", task_id, upid);
                            tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                            continue;
                        }
                        
                        if !task_status.is_ok() {
                            let error = task_status.exitstatus.unwrap_or_else(|| "Task failed".to_string());
                            error!("❌ Proxmox task failed: {}", error);

                            // Failsafe: reinstall/create clone can fail when the cloud-init disk
                            // already exists for the intended vmid (leftovers from previous attempts).
                            // Retry by bumping vmid and resetting task step back to "initial".
                            let err_str = &error;
                            let is_cloudinit_exists =
                                err_str.contains("cloudinit.qcow2") && err_str.contains("already exists");
                            let is_conf_atomic_exists =
                                err_str.contains("atomic file") && err_str.contains("File exists");
                            let is_conf_file_exists =
                                err_str.contains(".conf") && err_str.contains("File exists");

                            // Only retry during the clone phase (not later steps).
                            let current_step = meta["current_step"].as_str().unwrap_or("");
                            let should_retry_clone =
                                (task_type == "create" || task_type == "reinstall")
                                    && current_step == "resize"
                                    && (is_cloudinit_exists || is_conf_atomic_exists || is_conf_file_exists);

                            if should_retry_clone {
                                let current_vmid: i32 = task.try_get("vmid").unwrap_or(0);
                                let retry_count: u64 = meta["clone_retry"].as_u64().unwrap_or(0);
                                let max_retries: u64 = 5;

                                if retry_count < max_retries && current_vmid > 0 {
                                    let new_vmid = current_vmid + 1;
                                    warn!(
                                        "⚠️ Clone failed due to leftover files/config for vmid {}. Retrying with vmid {} (attempt {}/{}).",
                                        current_vmid,
                                        new_vmid,
                                        retry_count + 1,
                                        max_retries
                                    );

                                    let mut meta_mut = meta.clone();
                                    meta_mut["clone_retry"] = json!(retry_count + 1);
                                    meta_mut["current_step"] = json!("initial");
                                    meta_mut["awaiting_resize"] = json!(false);

                                    sqlx::query("UPDATE featherpanel_vm_tasks SET status = 'pending', upid = '', vmid = ?, data = ? WHERE task_id = ?")
                                        .bind(new_vmid)
                                        .bind(serde_json::to_string(&meta_mut)?)
                                        .bind(task_id)
                                        .execute(pool)
                                        .await?;

                                    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                                    continue;
                                }
                            }

                            // Disk resize can fail with qemu-img "got timeout" under storage load.
                            // Clear UPID and retry the resize step (do not bump vmid).
                            let awaiting_resize = meta["awaiting_resize"].as_bool().unwrap_or(false);
                            let should_retry_resize = (task_type == "create" || task_type == "reinstall")
                                && current_step == "resize"
                                && awaiting_resize
                                && is_transient_proxmox_resize_error(err_str);

                            if should_retry_resize {
                                let retry_count: u64 = meta["resize_retry"].as_u64().unwrap_or(0);
                                let max_retries: u64 = 5;

                                if retry_count < max_retries {
                                    let next_attempt = (retry_count as u32).saturating_add(1);
                                    let wait = resize_retry_backoff_secs(next_attempt);
                                    warn!(
                                        "⚠️ Disk resize failed with transient Proxmox error (attempt {}/{}): {}. Waiting {}s then retrying resize...",
                                        retry_count + 1,
                                        max_retries,
                                        error,
                                        wait
                                    );

                                    let mut meta_mut = meta.clone();
                                    meta_mut["resize_retry"] = json!(retry_count + 1);
                                    meta_mut["awaiting_resize"] = json!(false);
                                    meta_mut["current_step"] = json!("resize");

                                    sqlx::query(
                                        "UPDATE featherpanel_vm_tasks SET status = 'pending', upid = '', data = ? WHERE task_id = ?",
                                    )
                                    .bind(serde_json::to_string(&meta_mut)?)
                                    .bind(task_id)
                                    .execute(pool)
                                    .await?;

                                    tokio::time::sleep(tokio::time::Duration::from_secs(wait)).await;
                                    continue;
                                }

                                let hinted = format!(
                                    "{}. Tip: on the Proxmox node run `pvesm set <storage> --preallocation off` (e.g. `pvesm set raid1 --preallocation off`)",
                                    error
                                );
                                error!("❌ Disk resize retries exhausted: {}", hinted);

                                if task_type == "create" {
                                    if let Some(instance_id) = meta["instance_id"].as_i64() {
                                        let _ = sqlx::query("UPDATE featherpanel_vm_instances SET status = 'provisioning_failed' WHERE id = ?")
                                            .bind(instance_id)
                                            .execute(pool)
                                            .await;
                                        info!("⚠️ Marked VM instance {} as provisioning_failed", instance_id);
                                    }
                                }

                                mark_failed(pool, task_id, &hinted).await?;
                                return Ok(());
                            }

                            // For create tasks, mark VM instance as damaged if it exists
                            if task_type == "create" {
                                if let Some(instance_id) = meta["instance_id"].as_i64() {
                                    let _ = sqlx::query("UPDATE featherpanel_vm_instances SET status = 'provisioning_failed' WHERE id = ?")
                                        .bind(instance_id)
                                        .execute(pool)
                                        .await;
                                    info!("⚠️ Marked VM instance {} as provisioning_failed", instance_id);
                                }
                            }
                            
                            mark_failed(pool, task_id, &error).await?;
                            return Ok(());
                        }
                        
                        info!("✅ Proxmox task completed successfully");
                        
                        // For backup tasks, call the handler to process completion
                        if task_type == "backup" {
                            // Small delay to let Proxmox update storage listings
                            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                            
                            // Build client for backup handler
                            let node_row = sqlx::query("SELECT * FROM featherpanel_vm_nodes WHERE id = ?")
                                .bind(vm_node_id)
                                .fetch_optional(pool)
                                .await?;
                            
                            if let Some(node) = node_row {
                                let client = build_proxmox_client(&node, encryption_key)?;
                                match handle_backup_task(pool, task_id, &task, &meta, &client).await {
                                    Ok(_) => {
                                        return Ok(());
                                    }
                                    Err(e) => {
                                        mark_failed(pool, task_id, &format!("{}", e)).await?;
                                        return Ok(());
                                    }
                                }
                            }
                        }
                        
                        // Clear UPID and continue to next step
                        sqlx::query("UPDATE featherpanel_vm_tasks SET upid = '' WHERE task_id = ?")
                            .bind(task_id)
                            .execute(pool)
                            .await?;
                        
                        // Continue to process next step
                        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                        continue;
                    }
                    Err(e) => {
                        warn!("⚠️ Failed to get task status: {}", e);
                        if task_type == "backup" {
                            // Release the worker slot and retry during the next durable scan.
                            anyhow::bail!("Backup node unavailable: {}", e);
                        }
                        tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                        continue;
                    }
                }
            }
        }

        // Load node credentials
        let node_row = sqlx::query("SELECT * FROM featherpanel_vm_nodes WHERE id = ?")
            .bind(vm_node_id)
            .fetch_optional(pool)
            .await?;

        let node = match node_row {
            Some(row) => row,
            None => {
                mark_failed(pool, task_id, "Node not found").await?;
                return Ok(());
            }
        };

        let client = build_proxmox_client(&node, encryption_key)?;

        // Execute task based on type
        match task_type.as_str() {
            "power" => {
                handle_power_task(pool, task_id, &task, &meta, &client).await?;
                return Ok(());
            }
            "delete" => {
                handle_delete_task(pool, task_id, &task, &meta, &client).await?;
                return Ok(());
            }
            "create" => {
                match handle_create_task(pool, task_id, &task, &meta, &client).await {
                    Ok(_) => {
                        // Continue loop to check next step
                        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                        continue;
                    }
                    Err(e) => {
                        // Mark VM instance as damaged if it exists
                        if let Some(instance_id) = meta["instance_id"].as_i64() {
                            let _ = sqlx::query("UPDATE featherpanel_vm_instances SET status = 'provisioning_failed' WHERE id = ?")
                                .bind(instance_id)
                                .execute(pool)
                                .await;
                            info!("⚠️ Marked VM instance {} as provisioning_failed due to error", instance_id);
                        }
                        mark_failed(pool, task_id, &format!("{}", e)).await?;
                        return Ok(());
                    }
                }
            }
            "reinstall" => {
                match handle_reinstall_task(pool, task_id, &task, &meta, &client).await {
                    Ok(_) => {
                        // Continue loop to check next step
                        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                        continue;
                    }
                    Err(e) => {
                        error!("❌ Reinstall task failed: {}", e);
                        
                        // Try to recover: if we have old_vmid and new VM failed, keep the old one
                        if let Some(old_vmid) = meta["old_vmid"].as_i64() {
                            if let Some(instance_id) = meta["instance_id"].as_i64() {
                                let current_step = meta["current_step"].as_str().unwrap_or("");
                                
                                // If we failed before cleanup, the old VM is still there
                                if current_step == "initial" || current_step == "resize" || current_step == "config" {
                                    warn!("⚠️ Reinstall failed early - old VM {} is still intact", old_vmid);
                                    let _ = sqlx::query("UPDATE featherpanel_vm_instances SET status = 'stopped' WHERE id = ?")
                                        .bind(instance_id)
                                        .execute(pool)
                                        .await;
                                } else {
                                    // Failed after cleanup - mark as damaged
                                    warn!("⚠️ Reinstall failed after cleanup - VM may be in inconsistent state");
                                    let _ = sqlx::query("UPDATE featherpanel_vm_instances SET status = 'provisioning_failed' WHERE id = ?")
                                        .bind(instance_id)
                                        .execute(pool)
                                        .await;
                                }
                            }
                        }
                        
                        mark_failed(pool, task_id, &format!("{}", e)).await?;
                        return Ok(());
                    }
                }
            }
            "iso_fetch_and_mount" => {
                handle_iso_fetch_and_mount_task(pool, task_id, &task, &meta, &client).await?;
                return Ok(());
            }
            "restore_backup" => {
                // Restore backup just waits for UPID to complete, then marks task done
                // The UPID is already set when the task is created
                info!("✅ Backup restore completed successfully");
                
                // Update VM instance status if available
                if let Some(instance_id) = meta["instance_id"].as_i64() {
                    let _ = sqlx::query("UPDATE featherpanel_vm_instances SET status = 'stopped' WHERE id = ?")
                        .bind(instance_id)
                        .execute(pool)
                        .await;
                }
                
                mark_completed(pool, task_id).await?;
                return Ok(());
            }
            _ => {
                warn!("⚠️ Unknown task type: {}", task_type);
                mark_failed(pool, task_id, &format!("Task {} not yet implemented in Rust", task_type)).await?;
                return Ok(());
            }
        }
    }
}

fn build_proxmox_client(node: &sqlx::mysql::MySqlRow, encryption_key: &str) -> Result<ProxmoxClient> {
    let fqdn: String = node.try_get("fqdn").unwrap_or_default();
    let port: i32 = node.try_get("port").unwrap_or(8006);
    let scheme: String = node.try_get("scheme").unwrap_or_else(|_| "https".to_string());
    
    let enc_token_id: String = node.try_get("token_id").unwrap_or_default();
    let enc_secret: String = node.try_get("secret").unwrap_or_default();
    let user: String = node.try_get("user").unwrap_or_default();
    let tls_no_verify: String = node.try_get("tls_no_verify").unwrap_or_else(|_| "false".to_string());
    let dynamic_headers_str: String = node
        .try_get("additional_headers")
        .or_else(|_| node.try_get("addional_headers"))
        .unwrap_or_else(|_| "{}".to_string());
    let dynamic_params_str: String = node.try_get("additional_params").unwrap_or_else(|_| "{}".to_string());

    let encryptor = crate::encryption::Encryptor::new(encryption_key)?;
    
    let token_id = encryptor.decrypt(&enc_token_id)?;
    let secret = encryptor.decrypt(&enc_secret)?;
    let extra_headers: std::collections::HashMap<String, String> = serde_json::from_str(&dynamic_headers_str).unwrap_or_default();
    let extra_params: std::collections::HashMap<String, String> = serde_json::from_str(&dynamic_params_str).unwrap_or_default();

    ProxmoxClient::new(
        &fqdn,
        port as u16,
        &scheme,
        &user,
        &token_id,
        &secret,
        tls_no_verify == "true",
        extra_headers,
        extra_params,
    )
}

async fn handle_power_task(
    pool: &MySqlPool,
    task_id: &str,
    task: &sqlx::mysql::MySqlRow,
    meta: &Value,
    client: &ProxmoxClient,
) -> Result<()> {
    let action_str = meta["action"].as_str().unwrap_or("");
    let target_node: String = task.try_get("target_node").unwrap_or_default();
    let vmid: i32 = task.try_get("vmid").unwrap_or(0);
    let vm_type_str = meta["vm_type"].as_str().unwrap_or("qemu");
    let vm_type = VmType::from_str(vm_type_str);

    let power_action = match action_str {
        "start" => PowerAction::Start,
        "stop" => PowerAction::Stop,
        "shutdown" => PowerAction::Shutdown,
        "reboot" => PowerAction::Reboot,
        "reset" => PowerAction::Reset,
        "suspend" => PowerAction::Suspend,
        "resume" => PowerAction::Resume,
        _ => {
            mark_failed(pool, task_id, &format!("Unknown power action: {}", action_str)).await?;
            return Ok(());
        }
    };

    match client.power_action(&target_node, vmid as u32, vm_type, power_action).await {
        Ok(_) => {
            if let Some(instance_id) = meta["instance_id"].as_i64() {
                let status_str = match power_action {
                    PowerAction::Stop | PowerAction::Shutdown => "stopped",
                    PowerAction::Start => "running",
                    _ => "running",
                };
                let _ = sqlx::query("UPDATE featherpanel_vm_instances SET status = ? WHERE id = ?")
                    .bind(status_str)
                    .bind(instance_id)
                    .execute(pool)
                    .await;
            }

            mark_completed(pool, task_id).await?;
        }
        Err(e) => {
            let error_msg = format!("{}", e);
            
            // Check for common VM state errors
            if error_msg.contains("is paused") || error_msg.contains("is locked") {
                warn!("⚠️ VM in invalid state for action {}: {}", action_str, error_msg);
                mark_failed(pool, task_id, &format!("VM state error: {}", error_msg)).await?;
            } else {
                return Err(e);
            }
        }
    }

    Ok(())
}

async fn handle_delete_task(
    pool: &MySqlPool,
    task_id: &str,
    task: &sqlx::mysql::MySqlRow,
    meta: &Value,
    client: &ProxmoxClient,
) -> Result<()> {
    let target_node: String = task.try_get("target_node").unwrap_or_default();
    let vmid: i32 = task.try_get("vmid").unwrap_or(0);
    let vm_type_str = meta["vm_type"].as_str().unwrap_or("qemu");
    let vm_type = VmType::from_str(vm_type_str);
    let instance_id = meta["instance_id"].as_i64().unwrap_or(0);

    // Step 1: Delete all backups for this VM
    if instance_id > 0 {
        info!("🗑️ Checking for backups to delete...");
        let backups = sqlx::query("SELECT id, volid FROM featherpanel_vm_instance_backups WHERE vm_instance_id = ?")
            .bind(instance_id)
            .fetch_all(pool)
            .await?;
        
        if !backups.is_empty() {
            info!("🗑️ Found {} backup(s) to delete", backups.len());
            for backup in &backups {
                let backup_id: i64 = backup.try_get("id").unwrap_or(0);
                let volid: String = backup.try_get("volid").unwrap_or_default();
                
                if !volid.is_empty() {
                    info!("🗑️ Deleting backup: {}", volid);
                    let _ = delete_backup_from_proxmox(client, &target_node, &volid).await;
                }
                
                // Delete from database
                let _ = sqlx::query("DELETE FROM featherpanel_vm_instance_backups WHERE id = ?")
                    .bind(backup_id)
                    .execute(pool)
                    .await;
            }
            info!("✅ Deleted {} backup(s)", backups.len());
        } else {
            info!("ℹ️ No backups found for this VM");
        }
    }

    // Step 2: Stop the VM (ignore errors if already stopped)
    if !target_node.is_empty() && vmid > 0 {
        info!("🛑 Stopping VM {} (if running)...", vmid);
        match client.stop_vm(&target_node, vmid as u32, vm_type).await {
            Ok(_) => {
                info!("✅ VM stop command sent");
                tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
            }
            Err(e) => {
                let error_msg = format!("{}", e);
                if error_msg.contains("not running") || error_msg.contains("already stopped") {
                    info!("ℹ️ VM is already stopped");
                } else {
                    warn!("⚠️ Failed to stop VM (continuing anyway): {}", e);
                }
            }
        }
        
        // Step 3: Delete the VM from Proxmox (purge=1) and wait for the task so disks
        // (cloud-init, EFI, data volumes) are actually removed otherwise JSON returns
        // before Proxmox finishes and space/orphans can linger.
        info!("🗑️ Deleting VM {} from Proxmox...", vmid);
        match client.delete_vm(&target_node, vmid as u32, vm_type).await {
            Ok(upid) => {
                if !upid.is_empty() {
                    const DELETE_WAIT_SECS: u64 = 600;
                    match client
                        .wait_task(&target_node, &upid, DELETE_WAIT_SECS)
                        .await
                    {
                        Ok(()) => info!("✅ VM {} delete task completed on Proxmox", vmid),
                        Err(e) => warn!(
                            "⚠️ VM {} delete task did not finish cleanly (continuing): {}",
                            vmid, e
                        ),
                    }
                } else {
                    info!("✅ VM {} removed from Proxmox (synchronous delete)", vmid);
                }
            }
            Err(e) => {
                warn!("⚠️ Failed to delete VM from Proxmox: {}", e);
                // Continue anyway to clean up database
            }
        }
    }

    // Step 4: Queue email notification before deletion
    if instance_id > 0 {
        if let Err(e) = queue_vm_deleted_email(pool, instance_id).await {
            warn!("⚠️ Failed to queue VM deleted email: {}", e);
        }
    }

    // Step 5: Delete from database
    if instance_id > 0 {
        info!("🗑️ Removing VM instance {} from database...", instance_id);
        sqlx::query("DELETE FROM featherpanel_vm_instances WHERE id = ?")
            .bind(instance_id)
            .execute(pool)
            .await?;
        info!("✅ VM instance removed from database");
    }

    mark_completed(pool, task_id).await?;
    Ok(())
}

async fn handle_backup_task(
    pool: &MySqlPool,
    task_id: &str,
    task: &sqlx::mysql::MySqlRow,
    meta: &Value,
    client: &ProxmoxClient,
) -> Result<()> {
    let target_node: String = task.try_get("target_node").unwrap_or_default();
    let upid: String = task.try_get("upid").unwrap_or_default();
    let vmid: i32 = task.try_get("vmid").unwrap_or(0);
    let backup_id = meta["backup_id"].as_i64().ok_or_else(|| anyhow::anyhow!("No backup_id in metadata"))?;
    let backup_info = get_backup_info_from_task_log(client, &target_node, &upid, vmid as u32).await?;
    let instance_id: i32 = task.try_get("instance_id")?;
    update_backup_record_completed(pool, task_id, instance_id, backup_id, &backup_info).await?;
    Ok(())
}

fn backup_filename_from_log(lines: &[Value], vmid: u32) -> Option<String> {
    let pattern = regex::Regex::new(&format!(r#"vzdump-(?:qemu|lxc)-{}-[^\s'"/]+"#, vmid)).ok()?;
    let names: HashSet<String> = lines.iter().filter_map(|line| line["t"].as_str())
        .flat_map(|text| pattern.find_iter(text).map(|found| found.as_str().to_string()).collect::<Vec<_>>())
        .collect();
    if names.len() == 1 { names.into_iter().next() } else { None }
}

async fn get_backup_info_from_task_log(client: &ProxmoxClient, node: &str, upid: &str, vmid: u32) -> Result<Value> {
    let path = format!("/nodes/{}/tasks/{}/log?limit=10000", node, urlencoding::encode(upid));
    let log = client.get(&path).await?;
    let lines = log["data"].as_array().ok_or_else(|| anyhow::anyhow!("Missing task log"))?;
    let filename = backup_filename_from_log(lines, vmid).ok_or_else(|| anyhow::anyhow!("Task log does not identify a unique backup archive"))?;
    let storages = client.get(&format!("/nodes/{}/storage", node)).await?;
    let mut matches = Vec::new();
    if let Some(storages) = storages["data"].as_array() {
        for storage in storages {
            if let Some(name) = storage["storage"].as_str() {
                let content = client.get(&format!("/nodes/{}/storage/{}/content", node, name)).await;
                if let Ok(content) = content {
                    if let Some(items) = content["data"].as_array() {
                        for item in items {
                            if item["content"].as_str() == Some("backup") && item["vmid"].as_u64() == Some(vmid as u64)
                                && item["volid"].as_str().and_then(|v| v.rsplit('/').next()) == Some(filename.as_str()) {
                                let mut verified = item.clone();
                                verified["storage"] = json!(name);
                                matches.push(verified);
                            }
                        }
                    }
                }
            }
        }
    }
    if matches.len() == 1 { return Ok(matches.remove(0)); }
    anyhow::bail!("Task archive could not be uniquely verified in backup storage")
}

#[cfg(test)]
mod backup_recovery_tests {
    use super::*;
    #[test]
    fn archive_identity_is_scoped_to_vm_and_task_log() {
        let lines = vec![json!({"t": "creating vzdump archive '/mnt/storage/dump/vzdump-qemu-103-2026_10_06-12_00_00.vma.zst'"})];
        assert_eq!(backup_filename_from_log(&lines, 103), Some("vzdump-qemu-103-2026_10_06-12_00_00.vma.zst".into()));
        assert_eq!(backup_filename_from_log(&lines, 104), None);
        assert_eq!(backup_filename_from_log(&[], 103), None);
    }
    #[test]
    fn ambiguous_logs_are_not_assumed_to_be_latest_backup() {
        let lines = vec![json!({"t": "vzdump-lxc-103-one.tar.zst"}), json!({"t": "vzdump-lxc-103-two.tar.zst"})];
        assert_eq!(backup_filename_from_log(&lines, 103), None);
    }
}

async fn delete_backup_from_proxmox(
    client: &ProxmoxClient,
    node: &str,
    volid: &str,
) -> Result<()> {
    // Extract storage from volid (format: "storage:backup/file")
    let storage = volid.split(':').next().unwrap_or("");
    
    if storage.is_empty() {
        return Ok(());
    }
    
    // Delete the backup volume
    let path = format!("/nodes/{}/storage/{}/content/{}", node, storage, urlencoding::encode(volid));
    match client.delete(&path).await {
        Ok(_) => {
            info!("✅ Deleted backup {} from Proxmox", volid);
            Ok(())
        }
        Err(e) => {
            warn!("⚠️ Failed to delete backup from Proxmox: {}", e);
            Ok(()) // Don't fail the cleanup if Proxmox delete fails
        }
    }
}

async fn update_backup_record_completed(
    pool: &MySqlPool,
    task_id: &str,
    instance_id: i32,
    backup_id: i64,
    backup_info: &Value,
) -> Result<()> {
    let volid = backup_info["volid"].as_str().unwrap_or("");
    // Storage must match the volid prefix to avoid inconsistencies.
    let volid_storage = if volid.contains(':') {
        volid.split(':').next().unwrap_or("").to_string()
    } else {
        String::new()
    };
    let storage = if !volid_storage.is_empty() {
        volid_storage
    } else {
        backup_info["storage"].as_str().unwrap_or("").to_string()
    };
    
    if storage.is_empty() || volid.is_empty() { anyhow::bail!("Verified backup volume missing"); }
    
    let size_bytes = backup_info["size"].as_i64().unwrap_or(0);
    let ctime = backup_info["ctime"].as_i64().unwrap_or(0);
    let format = backup_info["format"].as_str();
    
    let mut transaction = pool.begin().await?;
    let claim = sqlx::query("UPDATE featherpanel_vm_tasks SET status = 'completed' WHERE task_id = ? AND instance_id = ? AND status IN ('pending', 'running')")
        .bind(task_id).bind(instance_id).execute(&mut *transaction).await?;
    if claim.rows_affected() == 0 { return Ok(()); }
    let updated = sqlx::query("UPDATE featherpanel_vm_instance_backups SET status = 'completed', storage = ?, volid = ?, size_bytes = ?, ctime = ?, format = ? WHERE id = ? AND vm_instance_id = ?")
        .bind(storage).bind(volid).bind(size_bytes).bind(ctime as i32).bind(format).bind(backup_id).bind(instance_id)
        .execute(&mut *transaction).await?;
    if updated.rows_affected() == 0 { anyhow::bail!("Owned backup record missing"); }
    transaction.commit().await?;
    Ok(())
}

async fn mark_failed(pool: &MySqlPool, task_id: &str, error: &str) -> Result<()> {
    let mut transaction = pool.begin().await?;
    let task = sqlx::query("SELECT data, task_type, instance_id, status FROM featherpanel_vm_tasks WHERE task_id = ? FOR UPDATE")
        .bind(task_id).fetch_optional(&mut *transaction).await?;
    if let Some(task) = task {
        let status: String = task.try_get("status")?;
        if status == "completed" || status == "failed" { return Ok(()); }
        let data: String = task.try_get("data").unwrap_or_else(|_| "{}".into());
        let mut meta: Value = serde_json::from_str(&data).unwrap_or(json!({}));
        if task.try_get::<String, _>("task_type")? == "backup" {
            if let Some(backup_id) = meta["backup_id"].as_i64() {
                let instance_id: i32 = task.try_get("instance_id")?;
                sqlx::query("UPDATE featherpanel_vm_instance_backups SET status = 'failed' WHERE id = ? AND vm_instance_id = ? AND status IN ('pending', 'running')")
                    .bind(backup_id).bind(instance_id).execute(&mut *transaction).await?;
            }
        }
        if let Some(step) = meta["current_step"].as_str() { meta["failed_at_step"] = json!(step); }
        sqlx::query("UPDATE featherpanel_vm_tasks SET status = 'failed', error = ?, data = ? WHERE task_id = ?")
            .bind(error).bind(serde_json::to_string(&meta)?).bind(task_id).execute(&mut *transaction).await?;
    }
    transaction.commit().await?;
    Ok(())
}

async fn mark_completed(pool: &MySqlPool, task_id: &str) -> Result<()> {
    info!("✅ Task {} completed", task_id);
    sqlx::query("UPDATE featherpanel_vm_tasks SET status = 'completed' WHERE task_id = ? AND status IN ('pending', 'running')")
        .bind(task_id)
        .execute(pool)
        .await?;
    Ok(())
}

async fn handle_iso_fetch_and_mount_task(
    pool: &MySqlPool,
    task_id: &str,
    task: &sqlx::mysql::MySqlRow,
    meta: &Value,
    client: &ProxmoxClient,
) -> Result<()> {
    let target_node: String = task.try_get("target_node").unwrap_or_default();
    let vmid: i32 = task.try_get("vmid").unwrap_or(0);

    let url = meta["url"].as_str().unwrap_or_default().to_string();
    let storage = meta["storage"].as_str().unwrap_or_default().to_string();

    if target_node.is_empty() || vmid <= 0 || url.is_empty() || storage.is_empty() {
        mark_failed(pool, task_id, "Missing required ISO task parameters").await?;
        return Ok(());
    }

    let verify_certificates = true;

    // Query filename before triggering the download.
    let md_res = match client
        .query_iso_url_metadata(&target_node, &url, verify_certificates)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            mark_failed(pool, task_id, &format!("ISO URL metadata failed: {}", e)).await?;
            return Ok(());
        }
    };

    let raw_filename = md_res["data"]["filename"].as_str().unwrap_or("uploaded.iso");

    // extjs returns a filename; sanitize it so we can build a safe volid.
    let mut filename = raw_filename
        .split('/')
        .last()
        .unwrap_or(raw_filename)
        .split('\\')
        .last()
        .unwrap_or(raw_filename)
        .to_string();

    let mut sanitized = String::new();
    for c in filename.chars() {
        if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' {
            sanitized.push(c);
        } else {
            sanitized.push('_');
        }
    }
    filename = if sanitized.trim().is_empty() {
        "uploaded.iso".to_string()
    } else {
        sanitized
    };

    if !filename.to_lowercase().ends_with(".iso") {
        filename.push_str(".iso");
    }

    // Start download (returns UPID).
    // Proxmox's extjs `download-url` refuses to overwrite an existing file.
    // When that happens, the ISO already exists in the storage path we would mount anyway,
    // so we treat it as success and skip waiting.
    let mut upid_opt: Option<String> = None;
    match client
        .download_iso_url_to_storage(&target_node, &storage, &url, &filename, verify_certificates)
        .await
    {
        Ok(u) => {
            upid_opt = Some(u);
        }
        Err(e) => {
            let err_str = format!("{}", e);
            if err_str.contains("refusing to override existing file") || err_str.contains("refusing to override") {
                info!(
                    "ℹ️ ISO already exists for url import; skipping download wait. filename={}",
                    filename
                );
            } else {
                mark_failed(pool, task_id, &format!("ISO download-url failed: {}", err_str)).await?;
                return Ok(());
            }
        }
    }

    if let Some(upid) = upid_opt {
        if let Err(e) = client.wait_task(&target_node, &upid, 900).await {
            let err_str = format!("{}", e);
            // Proxmox extjs `download-url` returns a UPID even when the underlying job
            // rejects the download due to "file exists". In that case, we can still
            // mount the already-existing ISO and treat it as success.
            if err_str.contains("refusing to override existing file") || err_str.contains("refusing to override") {
                info!("✅ ISO already existed on storage; reusing existing file (skip download wait).");
            } else {
                mark_failed(pool, task_id, &format!("ISO download task failed: {}", err_str)).await?;
                return Ok(());
            }
        }
    }

    let volid = format!("{}:iso/{}", storage, filename);

    // Load current VM config so we can unlink cdrom devices + preserve boot order.
    let cfg = match client
        .get_vm_config(&target_node, vmid as u32, VmType::Qemu)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            mark_failed(pool, task_id, &format!("Failed to fetch VM config: {}", e)).await?;
            return Ok(());
        }
    };

    // Unlink all devices that contain `media=cdrom` so only one ISO exists at a time.
    let mut cdrom_keys: Vec<String> = Vec::new();
    if let Some(obj) = cfg.as_object() {
        for (k, v) in obj {
            if let Some(s) = v.as_str() {
                if s.contains("media=cdrom") {
                    cdrom_keys.push(k.clone());
                }
            }
        }
    }

    if let Err(e) = client
        .unlink_qemu_disks(&target_node, vmid as u32, &cdrom_keys)
        .await
    {
        mark_failed(pool, task_id, &format!("Failed to unlink previous cdrom(s): {}", e)).await?;
        return Ok(());
    }

    let boot_str = cfg.get("boot").and_then(|v| v.as_str()).unwrap_or("");
    let mut boot_devices: Vec<String> = Vec::new();
    if let Some(order_idx) = boot_str.find("order=") {
        let after = &boot_str[(order_idx + "order=".len())..];
        let after = after.split(',').next().unwrap_or(after);
        boot_devices = after
            .split(';')
            .filter_map(|s| {
                let t = s.trim();
                if t.is_empty() {
                    None
                } else {
                    Some(t.to_string())
                }
            })
            .collect();
    }

    let mut final_devices: Vec<String> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();
    final_devices.push("ide2".to_string());
    seen.insert("ide2".to_string());
    for d in boot_devices {
        if d == "ide2" {
            continue;
        }
        if seen.insert(d.clone()) {
            final_devices.push(d);
        }
    }

    let boot_value = format!("order={}", final_devices.join(";"));

    let ide2_value = format!("{},media=cdrom", volid);
    let config = json!({
        "ide2": ide2_value,
        "boot": boot_value,
    });

    if let Err(e) = client
        .set_vm_config(&target_node, vmid as u32, VmType::Qemu, &config)
        .await
    {
        mark_failed(pool, task_id, &format!("Failed to set VM config: {}", e)).await?;
        return Ok(());
    }

    mark_completed(pool, task_id).await?;
    Ok(())
}

async fn queue_vm_deleted_email(pool: &MySqlPool, instance_id: i64) -> Result<()> {
    info!("📧 Queueing vm_deleted email for instance {}", instance_id);
    send_vm_email(pool, instance_id, &json!({}), "vm_deleted").await
}
