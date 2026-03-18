use anyhow::Result;
use sqlx::{MySqlPool, Row};
use tracing::{error, info, warn};
use serde_json::{json, Value};
use chrono;
use std::collections::HashSet;

use crate::proxmox::{ProxmoxClient, VmType, PowerAction};
use super::create::{handle_create_task, handle_reinstall_task};

// 🐛 DEBUG MODE - Set to true to print decrypted credentials (ONLY FOR DEVELOPMENT!)
const DEBUG_DECRYPT: bool = false;

pub async fn process_vm_task(pool: &MySqlPool, task_id: &str, encryption_key: &str, _debug_decrypt: bool) -> Result<()> {
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
        let data_str: String = task.try_get("data").unwrap_or_else(|_| "{}".to_string());
        let upid: String = task.try_get("upid").unwrap_or_default();
        
        let meta: Value = serde_json::from_str(&data_str).unwrap_or(serde_json::json!({}));

        // Set status to running if it's pending
        if status == "pending" {
            sqlx::query("UPDATE featherpanel_vm_tasks SET status = 'running' WHERE task_id = ?")
                .bind(task_id)
                .execute(pool)
                .await?;
            
            // For backup tasks, create the database record immediately
            if task_type == "backup" && !upid.is_empty() {
                let instance_id = meta["instance_id"].as_i64().unwrap_or(0);
                let vmid: i32 = task.try_get("vmid").unwrap_or(0);
                let backup_id = meta["backup_id"].as_i64();
                
                if backup_id.is_none() {
                    info!("📝 Creating pending backup record in database...");
                    let new_backup_id = create_pending_backup_record(pool, instance_id, vmid).await?;
                    
                    // Update task metadata with backup_id
                    let mut meta_mut = meta.clone();
                    meta_mut["backup_id"] = serde_json::json!(new_backup_id);
                    
                    sqlx::query("UPDATE featherpanel_vm_tasks SET data = ? WHERE task_id = ?")
                        .bind(serde_json::to_string(&meta_mut)?)
                        .bind(task_id)
                        .execute(pool)
                        .await?;
                    
                    info!("✅ Created pending backup record with ID: {}", new_backup_id);
                }
            }
        }

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
                            let err_str = error.clone();
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
                            
                            // For backup tasks, clean up the failed backup
                            if task_type == "backup" {
                                if let Some(backup_id) = meta["backup_id"].as_i64() {
                                    info!("🧹 Cleaning up failed backup record {}...", backup_id);
                                    
                                    // Try to delete the backup from Proxmox if it exists
                                    let target_node: String = task.try_get("target_node").unwrap_or_default();
                                    let _vmid: i32 = task.try_get("vmid").unwrap_or(0);
                                    
                                    // Get the volid if backup was partially created
                                    if let Ok(Some(backup_row)) = sqlx::query("SELECT volid FROM featherpanel_vm_instance_backups WHERE id = ?")
                                        .bind(backup_id)
                                        .fetch_optional(pool)
                                        .await 
                                    {
                                        let volid: String = backup_row.try_get("volid").unwrap_or_default();
                                        if !volid.is_empty() {
                                            info!("🗑️ Deleting failed backup from Proxmox: {}", volid);
                                            let _ = delete_backup_from_proxmox(&client, &target_node, &volid).await;
                                        }
                                    }
                                    
                                    // Mark backup as failed instead of deleting (for audit trail)
                                    let _ = sqlx::query("UPDATE featherpanel_vm_instance_backups SET status = 'failed' WHERE id = ?")
                                        .bind(backup_id)
                                        .execute(pool)
                                        .await;
                                    
                                    info!("✅ Marked backup record {} as failed", backup_id);
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
    let dynamic_headers_str: String = node.try_get("addional_headers").unwrap_or_else(|_| "{}".to_string());
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
        
        // Step 3: Delete the VM from Proxmox
        info!("🗑️ Deleting VM {} from Proxmox...", vmid);
        match client.delete_vm(&target_node, vmid as u32, vm_type).await {
            Ok(_) => info!("✅ VM deleted from Proxmox"),
            Err(e) => {
                warn!("⚠️ Failed to delete VM from Proxmox: {}", e);
                // Continue anyway to clean up database
            }
        }
    }

    // Step 4: Delete from database
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
    let vmid: i32 = task.try_get("vmid").unwrap_or(0);
    let upid: String = task.try_get("upid").unwrap_or_default();
    let vm_node_id: i32 = task.try_get("vm_node_id").unwrap_or(0);
    let backup_id = meta["backup_id"].as_i64().ok_or_else(|| anyhow::anyhow!("No backup_id in metadata"))?;

    info!("📝 Updating backup record {} with Proxmox details...", backup_id);

    // Enforce node-level preferred backup storage when trying to locate the created backup.
    let mut preferred_backup_storage: Option<String> = None;
    if vm_node_id > 0 {
        if let Ok(node_row) = sqlx::query("SELECT storage_backups FROM featherpanel_vm_nodes WHERE id = ?")
            .bind(vm_node_id)
            .fetch_optional(pool)
            .await
        {
            if let Some(n) = node_row {
                let s: String = n.try_get("storage_backups").unwrap_or_default();
                let s = s.trim().to_string();
                if !s.is_empty() {
                    preferred_backup_storage = Some(s);
                }
            }
        }
    }
    
    // Prefer task log parsing (it is specific to this UPID, so we won't accidentally pick a different/latest backup).
    if !upid.is_empty() {
        match get_backup_info_from_task_log(client, &target_node, &upid).await {
            Ok(backup_info) => {
                update_backup_record_completed(pool, backup_id, &backup_info).await?;
                info!("✅ Updated backup record {} from task log - marked as completed", backup_id);
                mark_completed(pool, task_id).await?;
                return Ok(());
            }
            Err(log_err) => {
                warn!("⚠️ Could not parse task log for backup_id {}: {}", backup_id, log_err);
            }
        }
    }

    // Fallback: locate the created backup by scanning storages, but restrict to the configured preferred storage when available.
    match get_latest_backup_info(
        client,
        &target_node,
        vmid as u32,
        preferred_backup_storage.as_deref(),
    )
    .await
    {
        Ok(backup_info) => {
            match update_backup_record_completed(pool, backup_id, &backup_info).await {
                Ok(_) => {
                    info!("✅ Updated backup record {} - marked as completed", backup_id);
                    mark_completed(pool, task_id).await?;
                }
                Err(e) => {
                    error!("❌ Failed to update backup record: {}", e);
                    let _ = sqlx::query("UPDATE featherpanel_vm_instance_backups SET status = 'failed' WHERE id = ?")
                        .bind(backup_id)
                        .execute(pool)
                        .await;
                    return Err(e);
                }
            }
        }
        Err(e) => {
            warn!("⚠️ Could not fetch backup details from storage: {}", e);

            // Last resort: mark backup as completed but without full details.
            // This is better than failing completely since the backup exists in Proxmox.
            warn!("⚠️ Backup completed in Proxmox but couldn't fetch details - marking as completed anyway");
            sqlx::query("UPDATE featherpanel_vm_instance_backups SET status = 'completed' WHERE id = ?")
                .bind(backup_id)
                .execute(pool)
                .await?;
            info!("✅ Marked backup {} as completed (without full details)", backup_id);
            mark_completed(pool, task_id).await?;
        }
    }

    Ok(())
}

async fn get_latest_backup_info(
    client: &ProxmoxClient,
    node: &str,
    vmid: u32,
    preferred_storage: Option<&str>,
) -> Result<Value> {
    // Get list of storages on this specific node
    let path = format!("/nodes/{}/storage", node);
    let storages = client.get(&path).await?;
    
    // Iterate through storages to find backups
    if let Some(storage_list) = storages["data"].as_array() {
        for storage in storage_list {
            // Skip storages that are not active or available
            if storage["status"].as_str() != Some("available") {
                continue;
            }
            
            if let Some(storage_name) = storage["storage"].as_str() {
                if let Some(pref) = preferred_storage {
                    if !pref.is_empty() && storage_name != pref {
                        continue;
                    }
                }

                // Check if this storage supports backup content
                let content = storage["content"].as_str().unwrap_or("");
                if !content.contains("backup") && !content.contains("vztmpl") {
                    continue;
                }
                
                // Try to get backups from this storage
                let backup_path = format!("/nodes/{}/storage/{}/content", node, storage_name);
                match client.get(&backup_path).await {
                    Ok(content) => {
                        if let Some(items) = content["data"].as_array() {
                            // Find the most recent backup for this VMID
                            let mut latest_backup: Option<Value> = None;
                            let mut latest_ctime = 0i64;
                            
                            for item in items {
                                if item["content"].as_str() == Some("backup") 
                                    && item["vmid"].as_i64() == Some(vmid as i64) {
                                    let ctime = item["ctime"].as_i64().unwrap_or(0);
                                    if ctime > latest_ctime {
                                        latest_ctime = ctime;
                                        latest_backup = Some(item.clone());
                                    }
                                }
                            }
                            
                            if let Some(backup) = latest_backup {
                                return Ok(backup);
                            }
                        }
                    }
                    Err(e) => {
                        // Skip storages that error (not available, no permission, etc.)
                        warn!("⚠️ Skipping storage {}: {}", storage_name, e);
                        continue;
                    }
                }
            }
        }
    }
    
    anyhow::bail!("No backup found for VM {}", vmid)
}

async fn get_backup_info_from_task_log(
    client: &ProxmoxClient,
    node: &str,
    upid: &str,
) -> Result<Value> {
    // Get task log
    let path = format!("/nodes/{}/tasks/{}/log", node, urlencoding::encode(upid));
    let log_result = client.get(&path).await?;
    
    if let Some(log_lines) = log_result["data"].as_array() {
        let mut volid = String::new();
        let mut size_bytes = 0i64;
        let mut storage_name = String::new();
        
        // Parse log lines to find backup info
        for line in log_lines {
            let text = if let Some(t) = line["t"].as_str() {
                t
            } else if let Some(n) = line["n"].as_i64() {
                // Sometimes log format is different
                if let Some(t) = log_lines.get(n as usize).and_then(|l| l["t"].as_str()) {
                    t
                } else {
                    continue;
                }
            } else {
                continue;
            };
            
            // Look for patterns like:
            // "creating vzdump archive '/var/lib/vz/dump/vzdump-qemu-103-2026_03_18-17_06_19.vma.zst'"
            // "backup file: /mnt/pve/local/dump/vzdump-qemu-103-..."
            // "archive file size: 451.23MB"
            
            // Try to find volid from various patterns
            if volid.is_empty() {
                // Pattern 1: creating vzdump archive
                if let Some(start) = text.find("vzdump-") {
                    if let Some(end) = text[start..].find(|c: char| c == '\'' || c == '"' || c == ' ') {
                        let filename = &text[start..start + end];
                        // Extract storage from path
                        if let Some(dump_pos) = text[..start].rfind("/dump/") {
                            if let Some(storage_start) = text[..dump_pos].rfind("/") {
                                storage_name = text[storage_start + 1..dump_pos].to_string();
                                volid = format!("{}:backup/{}", storage_name, filename);
                            }
                        }
                        // Fallback: assume local storage
                        if volid.is_empty() {
                            storage_name = "local".to_string();
                            volid = format!("local:backup/{}", filename);
                        }
                    }
                }
                
                // Pattern 2: backup file: path
                if volid.is_empty() && text.contains("backup file:") {
                    if let Some(vzdump_pos) = text.find("vzdump-") {
                        if let Some(end) = text[vzdump_pos..].find(char::is_whitespace) {
                            let filename = &text[vzdump_pos..vzdump_pos + end];
                            storage_name = "local".to_string();
                            volid = format!("local:backup/{}", filename);
                        }
                    }
                }
            }
            
            // Look for size
            if size_bytes == 0 {
                if text.contains("archive file size:") || text.contains("backup file size:") {
                    // Try to extract number before MB/GB
                    if let Some(mb_pos) = text.find("MB") {
                        let before_mb = &text[..mb_pos];
                        if let Some(num_start) = before_mb.rfind(|c: char| !c.is_numeric() && c != '.') {
                            if let Ok(size_mb) = before_mb[num_start + 1..].trim().parse::<f64>() {
                                size_bytes = (size_mb * 1024.0 * 1024.0) as i64;
                            }
                        }
                    } else if let Some(gb_pos) = text.find("GB") {
                        let before_gb = &text[..gb_pos];
                        if let Some(num_start) = before_gb.rfind(|c: char| !c.is_numeric() && c != '.') {
                            if let Ok(size_gb) = before_gb[num_start + 1..].trim().parse::<f64>() {
                                size_bytes = (size_gb * 1024.0 * 1024.0 * 1024.0) as i64;
                            }
                        }
                    }
                }
            }
        }
        
        if !volid.is_empty() {
            if storage_name.is_empty() {
                storage_name = volid.split(':').next().unwrap_or("local").to_string();
            }
            
            info!("📋 Parsed from log: volid={}, storage={}, size={}MB", 
                volid, storage_name, size_bytes / 1024 / 1024);
            
            return Ok(json!({
                "volid": volid,
                "storage": storage_name,
                "size": size_bytes,
                "ctime": chrono::Utc::now().timestamp(),
                "format": if volid.contains(".zst") { "zst" } else if volid.contains(".lzo") { "lzo" } else { "vma" }
            }));
        }
    }
    
    anyhow::bail!("Could not parse backup info from task log")
}

async fn create_pending_backup_record(
    pool: &MySqlPool,
    instance_id: i64,
    vmid: i32,
) -> Result<i64> {
    let result = sqlx::query(
        "INSERT INTO featherpanel_vm_instance_backups 
        (vm_instance_id, vmid, status, storage, volid, size_bytes, ctime) 
        VALUES (?, ?, 'pending', '', '', 0, 0)"
    )
    .bind(instance_id)
    .bind(vmid)
    .execute(pool)
    .await?;
    
    Ok(result.last_insert_id() as i64)
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
    
    // As a safety fallback, if storage is still empty, do nothing special.
    
    let size_bytes = backup_info["size"].as_i64().unwrap_or(0);
    let ctime = backup_info["ctime"].as_i64().unwrap_or(0);
    let format = backup_info["format"].as_str();
    
    // Update without notes column for now (will be added later if needed)
    sqlx::query(
        "UPDATE featherpanel_vm_instance_backups 
        SET status = 'completed', storage = ?, volid = ?, size_bytes = ?, ctime = ?, format = ? 
        WHERE id = ?"
    )
    .bind(storage.clone())
    .bind(volid)
    .bind(size_bytes)
    .bind(ctime as i32)
    .bind(format)
    .bind(backup_id)
    .execute(pool)
    .await?;
    
    info!("✅ Updated backup record {}: storage={}, volid={}, size={}MB", 
        backup_id, storage, volid, size_bytes / 1024 / 1024);
    Ok(())
}

async fn mark_failed(pool: &MySqlPool, task_id: &str, error: &str) -> Result<()> {
    error!("❌ Task {} failed: {}", task_id, error);
    
    // Get current task data to preserve step information
    let task = sqlx::query("SELECT data FROM featherpanel_vm_tasks WHERE task_id = ?")
        .bind(task_id)
        .fetch_optional(pool)
        .await?;
    
    if let Some(task_row) = task {
        let data_str: String = task_row.try_get("data").unwrap_or_else(|_| "{}".to_string());
        let mut meta: Value = serde_json::from_str(&data_str).unwrap_or(serde_json::json!({}));
        
        // Store the failed step for debugging
        if let Some(step) = meta["current_step"].as_str() {
            meta["failed_at_step"] = serde_json::json!(step);
        }
        
        sqlx::query("UPDATE featherpanel_vm_tasks SET status = 'failed', error = ?, data = ? WHERE task_id = ?")
            .bind(error)
            .bind(serde_json::to_string(&meta)?)
            .bind(task_id)
            .execute(pool)
            .await?;
    } else {
        sqlx::query("UPDATE featherpanel_vm_tasks SET status = 'failed', error = ? WHERE task_id = ?")
            .bind(error)
            .bind(task_id)
            .execute(pool)
            .await?;
    }
    
    Ok(())
}

async fn mark_completed(pool: &MySqlPool, task_id: &str) -> Result<()> {
    info!("✅ Task {} completed", task_id);
    sqlx::query("UPDATE featherpanel_vm_tasks SET status = 'completed' WHERE task_id = ?")
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
    let max_bytes: i64 = meta["max_bytes"].as_i64().unwrap_or(1024 * 1024 * 1024);

    if target_node.is_empty() || vmid <= 0 || url.is_empty() || storage.is_empty() {
        mark_failed(pool, task_id, "Missing required ISO task parameters").await?;
        return Ok(());
    }

    let verify_certificates = true;

    // Query size + filename so we can enforce the max size before triggering the download.
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

    let size_bytes = md_res["data"]["size"].as_i64().unwrap_or(-1);
    let raw_filename = md_res["data"]["filename"].as_str().unwrap_or("uploaded.iso");

    if size_bytes >= 0 && size_bytes > max_bytes {
        mark_failed(pool, task_id, "ISO too large for panel limit (max 1 GiB)").await?;
        return Ok(());
    }

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
