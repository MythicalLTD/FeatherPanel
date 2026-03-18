use anyhow::Result;
use sqlx::{MySqlPool, Row};
use serde_json::{json, Value};
use tracing::{info, warn};

use crate::proxmox::{ProxmoxClient, VmType};

/// Handle the create task with state machine
pub async fn handle_create_task(
    pool: &MySqlPool,
    task_id: &str,
    task: &sqlx::mysql::MySqlRow,
    meta: &Value,
    client: &ProxmoxClient,
) -> Result<()> {
    let upid: String = task.try_get("upid").unwrap_or_default();
    
    // If there's a UPID, wait for it to complete first (handled by main loop)
    if !upid.is_empty() {
        return Ok(());
    }
    
    let step = meta["current_step"].as_str().unwrap_or("initial");
    let target_node: String = task.try_get("target_node").unwrap_or_default();
    let vmid: i32 = task.try_get("vmid").unwrap_or(0);
    let vm_type_str = meta["vm_type"].as_str().unwrap_or("qemu");
    let vm_type = VmType::from_str(vm_type_str);

    match step {
        "initial" => {
            info!("🔧 CREATE: Initiating clone operation...");
            initiate_clone(pool, task_id, task, meta, client).await?;
        }
        "resize" => {
            info!("🔧 CREATE: Checking disk resize...");
            handle_resize_step(pool, task_id, &target_node, vmid as u32, vm_type, meta, client).await?;
        }
        "config" => {
            info!("🔧 CREATE: Applying VM configuration...");
            apply_create_config(pool, task_id, task, &target_node, vmid as u32, vm_type, meta, client).await?;
        }
        "start" => {
            info!("🔧 CREATE: Starting VM...");
            let start_upid = client.start_vm(&target_node, vmid as u32, vm_type).await?;
            
            if !start_upid.is_empty() {
                // Update UPID and advance to finalize step
                let mut meta_mut = meta.clone();
                meta_mut["current_step"] = json!("finalize");
                
                sqlx::query("UPDATE featherpanel_vm_tasks SET upid = ?, data = ? WHERE task_id = ?")
                    .bind(&start_upid)
                    .bind(serde_json::to_string(&meta_mut)?)
                    .bind(task_id)
                    .execute(pool)
                    .await?;
                
                info!("✅ Start initiated with UPID: {}, advancing to finalize step", start_upid);
            } else {
                // Start succeeded without UPID
                finalize_create(pool, task_id, meta).await?;
            }
        }
        "finalize" => {
            info!("🔧 CREATE: Finalizing...");
            finalize_create(pool, task_id, meta).await?;
        }
        _ => {
            warn!("Unknown create step: {}", step);
        }
    }
    
    Ok(())
}

async fn initiate_clone(
    pool: &MySqlPool,
    task_id: &str,
    task: &sqlx::mysql::MySqlRow,
    meta: &Value,
    client: &ProxmoxClient,
) -> Result<()> {
    let template_vmid = meta["template_vmid"].as_i64().unwrap_or(0) as u32;
    let template_node = meta["template_node"].as_str().unwrap_or("");
    let target_node: String = task.try_get("target_node").unwrap_or_default();
    let vmid: i32 = task.try_get("vmid").unwrap_or(0);
    let default_hostname = format!("vm-{}", vmid);
    let hostname = meta["hostname"].as_str().unwrap_or(&default_hostname);
    let vm_type_str = meta["vm_type"].as_str().unwrap_or("qemu");
    let storage = meta["storage"].as_str().unwrap_or("local");
    
    if template_vmid == 0 || vmid == 0 || target_node.is_empty() {
        anyhow::bail!("Invalid create metadata");
    }
    
    let upid = if vm_type_str == "qemu" {
        client.clone_qemu(
            template_node,
            template_vmid,
            vmid as u32,
            hostname,
            Some(&target_node),
        ).await?
    } else {
        client.clone_lxc(
            template_node,
            template_vmid,
            vmid as u32,
            hostname,
            Some(&target_node),
            storage,
        ).await?
    };
    
    // Update task with UPID and advance to resize step
    let mut meta_mut = meta.clone();
    meta_mut["current_step"] = json!("resize");
    
    sqlx::query("UPDATE featherpanel_vm_tasks SET upid = ?, status = 'running', data = ? WHERE task_id = ?")
        .bind(&upid)
        .bind(serde_json::to_string(&meta_mut)?)
        .bind(task_id)
        .execute(pool)
        .await?;
    
    info!("✅ Clone initiated with UPID: {}, advancing to resize step", upid);
    Ok(())
}

async fn handle_resize_step(
    pool: &MySqlPool,
    task_id: &str,
    node: &str,
    vmid: u32,
    vm_type: VmType,
    meta: &Value,
    client: &ProxmoxClient,
) -> Result<()> {
    let requested_disk_gb = meta["disk"].as_i64().or_else(|| meta["disk_gb"].as_i64()).unwrap_or(0);
    
    if requested_disk_gb > 0 {
        // Get current disk size
        let config = client.get_vm_config(node, vmid, vm_type).await?;
        let disk_key = if vm_type.as_str() == "qemu" {
            meta["root_disk"].as_str().unwrap_or("scsi0")
        } else {
            "rootfs"
        };
        
        let current_disk_gb = extract_disk_size(&config, disk_key);
        
        if requested_disk_gb > current_disk_gb {
            info!("📏 Resizing disk from {}G to {}G", current_disk_gb, requested_disk_gb);
            let upid = client.resize_disk(node, vmid, vm_type, disk_key, &format!("{}G", requested_disk_gb)).await?;
            
            if !upid.is_empty() {
                update_task_upid(pool, task_id, &upid).await?;
                return Ok(());
            }
        } else {
            info!("✅ Disk already {}G or larger, skipping resize", current_disk_gb);
        }
    }
    
    // Move to next step
    advance_step(pool, task_id, "config").await?;
    Ok(())
}

async fn apply_create_config(
    pool: &MySqlPool,
    task_id: &str,
    task: &sqlx::mysql::MySqlRow,
    node: &str,
    vmid: u32,
    vm_type: VmType,
    meta: &Value,
    client: &ProxmoxClient,
) -> Result<()> {
    let user_uuid: String = task.try_get("user_uuid").unwrap_or_default();
    let default_hostname = format!("vm-{}", vmid);
    let hostname = meta["hostname"].as_str().unwrap_or(&default_hostname);
    
    // Get IP info
    let ip_id = meta["vm_ip_id"].as_i64().unwrap_or(0);
    let ip_row = sqlx::query("SELECT * FROM featherpanel_vm_ips WHERE id = ?")
        .bind(ip_id)
        .fetch_optional(pool)
        .await?;
    
    let ip_row = ip_row.ok_or_else(|| anyhow::anyhow!("IP not found"))?;
    let ip: String = ip_row.try_get("ip")?;
    let cidr: i32 = ip_row.try_get("cidr").unwrap_or(24);
    let gateway: String = ip_row.try_get("gateway").unwrap_or_default();
    
    let memory = meta["memory"].as_i64().unwrap_or(512);
    let cpus = meta["cpus"].as_i64().unwrap_or(1);
    let cores = meta["cores"].as_i64().unwrap_or(1);
    let on_boot = meta["on_boot"].as_bool().unwrap_or(false);
    let bridge = meta["bridge"].as_str().unwrap_or("vmbr0");
    
    let config = if vm_type.as_str() == "qemu" {
        let ci_user = meta["ci_user"].as_str().unwrap_or("debian");
        let ci_password = meta["ci_password"].as_str().unwrap_or("changeme");
        let ipconfig = if gateway.is_empty() {
            format!("ip={}/{}", ip, cidr)
        } else {
            format!("ip={}/{},gw={}", ip, cidr, gateway)
        };
        
        json!({
            "memory": memory,
            "sockets": cpus,
            "cores": cores,
            "nameserver": "1.1.1.1 8.8.8.8",
            "ipconfig0": ipconfig,
            "onboot": if on_boot { 1 } else { 0 },
            "boot": "order=scsi0",
            "ciuser": ci_user,
            "cipassword": ci_password,
            "tags": "FeatherPanel-Managed",
            "description": format!("FeatherPanel Managed VM | IP: {} | Hostname: {} | User: {} | Created: {}", 
                ip, hostname, user_uuid, chrono::Utc::now().format("%Y-%m-%d %H:%M:%S"))
        })
    } else {
        let net0 = if gateway.is_empty() {
            format!("name=eth0,bridge={},ip={}/{}", bridge, ip, cidr)
        } else {
            format!("name=eth0,bridge={},ip={}/{},gw={}", bridge, ip, cidr, gateway)
        };
        
        json!({
            "memory": memory,
            "cores": cpus * cores,
            "nameserver": "1.1.1.1 8.8.8.8",
            "net0": net0,
            "onboot": if on_boot { 1 } else { 0 },
            "tags": "FeatherPanel-Managed",
            "description": format!("FeatherPanel Managed VM | IP: {} | Hostname: {} | User: {} | Created: {}", 
                ip, hostname, user_uuid, chrono::Utc::now().format("%Y-%m-%d %H:%M:%S"))
        })
    };
    
    client.set_vm_config(node, vmid, vm_type, &config).await?;
    
    // Create database record
    create_vm_instance_record(pool, task, meta, vmid, node, &ip, &gateway, hostname).await?;
    
    // Move to start step
    advance_step(pool, task_id, "start").await?;
    Ok(())
}

async fn create_vm_instance_record(
    pool: &MySqlPool,
    task: &sqlx::mysql::MySqlRow,
    meta: &Value,
    vmid: u32,
    node: &str,
    ip: &str,
    gateway: &str,
    hostname: &str,
) -> Result<i64> {
    let vm_node_id: i32 = task.try_get("vm_node_id")?;
    let user_uuid: String = task.try_get("user_uuid")?;
    let vm_type = meta["vm_type"].as_str().unwrap_or("qemu");
    let plan_id = meta["plan_id"].as_i64();
    let template_id = meta["template_id"].as_i64();
    let vm_ip_id = meta["vm_ip_id"].as_i64().unwrap_or(0);
    let memory = meta["memory"].as_i64().unwrap_or(512);
    let cpus = meta["cpus"].as_i64().unwrap_or(1);
    let cores = meta["cores"].as_i64().unwrap_or(1);
    let disk_gb = meta["disk"].as_i64().unwrap_or(10);
    let backup_limit = meta["backup_limit"].as_i64().unwrap_or(5);
    let on_boot = meta["on_boot"].as_bool().unwrap_or(false);
    let notes = meta["notes"].as_str();
    
    let result = sqlx::query(
        "INSERT INTO featherpanel_vm_instances 
        (vmid, vm_node_id, user_uuid, pve_node, plan_id, template_id, vm_type, hostname, status, 
         ip_address, gateway, vm_ip_id, notes, backup_limit, memory, cpus, cores, disk_gb, on_boot)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'stopped', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(vmid)
    .bind(vm_node_id)
    .bind(&user_uuid)
    .bind(node)
    .bind(plan_id)
    .bind(template_id)
    .bind(vm_type)
    .bind(hostname)
    .bind(ip)
    .bind(if gateway.is_empty() { None } else { Some(gateway) })
    .bind(vm_ip_id)
    .bind(notes)
    .bind(backup_limit)
    .bind(memory)
    .bind(cpus)
    .bind(cores)
    .bind(disk_gb)
    .bind(if on_boot { 1 } else { 0 })
    .execute(pool)
    .await?;
    
    let instance_id = result.last_insert_id() as i64;
    info!("✅ Created VM instance record: {}", instance_id);
    
    // Update task meta with instance_id
    let task_id: String = task.try_get("task_id")?;
    let mut meta_mut = meta.clone();
    meta_mut["instance_id"] = json!(instance_id);
    
    sqlx::query("UPDATE featherpanel_vm_tasks SET data = ? WHERE task_id = ?")
        .bind(serde_json::to_string(&meta_mut)?)
        .bind(&task_id)
        .execute(pool)
        .await?;
    
    Ok(instance_id)
}

async fn finalize_create(pool: &MySqlPool, task_id: &str, meta: &Value) -> Result<()> {
    if let Some(instance_id) = meta["instance_id"].as_i64() {
        sqlx::query("UPDATE featherpanel_vm_instances SET status = 'running' WHERE id = ?")
            .bind(instance_id)
            .execute(pool)
            .await?;
    }
    
    sqlx::query("UPDATE featherpanel_vm_tasks SET status = 'completed' WHERE task_id = ?")
        .bind(task_id)
        .execute(pool)
        .await?;
    
    info!("✅ CREATE task completed successfully");
    Ok(())
}

fn extract_disk_size(config: &Value, disk_key: &str) -> i64 {
    if let Some(disk_value) = config[disk_key].as_str() {
        if let Some(caps) = regex::Regex::new(r"size=(\d+)([GgMmTt])?")
            .ok()
            .and_then(|re| re.captures(disk_value))
        {
            let num: i64 = caps.get(1).and_then(|m| m.as_str().parse().ok()).unwrap_or(0);
            let unit = caps.get(2).map(|m| m.as_str().to_lowercase()).unwrap_or_else(|| "g".to_string());
            
            return match unit.as_str() {
                "m" => (num as f64 / 1024.0).ceil() as i64,
                "t" => num * 1024,
                _ => num,
            };
        }
    }
    0
}

async fn update_task_upid(pool: &MySqlPool, task_id: &str, upid: &str) -> Result<()> {
    sqlx::query("UPDATE featherpanel_vm_tasks SET upid = ? WHERE task_id = ?")
        .bind(upid)
        .bind(task_id)
        .execute(pool)
        .await?;
    Ok(())
}

async fn advance_step(pool: &MySqlPool, task_id: &str, next_step: &str) -> Result<()> {
    // Get current task data
    let task = sqlx::query("SELECT data FROM featherpanel_vm_tasks WHERE task_id = ?")
        .bind(task_id)
        .fetch_one(pool)
        .await?;
    
    let data_str: String = task.try_get("data").unwrap_or_else(|_| "{}".to_string());
    let mut meta: Value = serde_json::from_str(&data_str)?;
    meta["current_step"] = json!(next_step);
    
    sqlx::query("UPDATE featherpanel_vm_tasks SET data = ?, upid = '' WHERE task_id = ?")
        .bind(serde_json::to_string(&meta)?)
        .bind(task_id)
        .execute(pool)
        .await?;
    
    info!("➡️  Advanced to step: {}", next_step);
    Ok(())
}

pub async fn handle_reinstall_task(
    pool: &MySqlPool,
    task_id: &str,
    task: &sqlx::mysql::MySqlRow,
    meta: &Value,
    client: &ProxmoxClient,
) -> Result<()> {
    let upid: String = task.try_get("upid").unwrap_or_default();
    
    // If there's a UPID, wait for it to complete first (handled by main loop)
    if !upid.is_empty() {
        return Ok(());
    }
    
    let step = meta["current_step"].as_str().unwrap_or("initial");
    let target_node: String = task.try_get("target_node").unwrap_or_default();
    let vmid: i32 = task.try_get("vmid").unwrap_or(0);
    let vm_type_str = meta["vm_type"].as_str().unwrap_or("qemu");
    let vm_type = VmType::from_str(vm_type_str);
    let instance_id = meta["instance_id"].as_i64().unwrap_or(0);

    // Validate critical data exists
    if instance_id == 0 {
        anyhow::bail!("Missing instance_id - cannot proceed with reinstall");
    }

    match step {
        "initial" => {
            info!("🔧 REINSTALL: Initiating clone operation...");
            
            // Store old_vmid before we start (fail-safe)
            if meta["old_vmid"].is_null() {
                let mut meta_mut = meta.clone();
                meta_mut["old_vmid"] = json!(vmid);
                sqlx::query("UPDATE featherpanel_vm_tasks SET data = ? WHERE task_id = ?")
                    .bind(serde_json::to_string(&meta_mut)?)
                    .bind(task_id)
                    .execute(pool)
                    .await?;
                info!("✅ Stored old_vmid {} as fail-safe", vmid);
                return Ok(());
            }
            
            initiate_clone(pool, task_id, task, meta, client).await?;
        }
        "resize" => {
            info!("🔧 REINSTALL: Checking disk resize...");
            handle_resize_step(pool, task_id, &target_node, vmid as u32, vm_type, meta, client).await?;
        }
        "config" => {
            info!("🔧 REINSTALL: Applying VM configuration...");
            apply_reinstall_config(pool, task_id, task, &target_node, vmid as u32, vm_type, meta, client).await?;
        }
        "backups" => {
            info!("🔧 REINSTALL: Deleting old backups...");
            delete_instance_backups(pool, meta, client, &target_node).await?;
            advance_step(pool, task_id, "cleanup").await?;
        }
        "cleanup" => {
            info!("🔧 REINSTALL: Cleaning up old VM...");
            cleanup_old_vm(pool, task_id, meta, client, &target_node, vm_type).await?;
        }
        "update_db" => {
            info!("🔧 REINSTALL: Updating database records...");
            update_reinstall_db(pool, task_id, task, meta, &target_node, vmid).await?;
        }
        "start" => {
            info!("🔧 REINSTALL: Starting VM...");
            let start_upid = client.start_vm(&target_node, vmid as u32, vm_type).await?;
            
            if !start_upid.is_empty() {
                // Update UPID and advance to finalize step
                let mut meta_mut = meta.clone();
                meta_mut["current_step"] = json!("finalize");
                
                sqlx::query("UPDATE featherpanel_vm_tasks SET upid = ?, data = ? WHERE task_id = ?")
                    .bind(&start_upid)
                    .bind(serde_json::to_string(&meta_mut)?)
                    .bind(task_id)
                    .execute(pool)
                    .await?;
                
                info!("✅ Start initiated with UPID: {}, advancing to finalize step", start_upid);
            } else {
                // Start succeeded without UPID
                finalize_reinstall(pool, task_id, meta).await?;
            }
        }
        "finalize" => {
            info!("🔧 REINSTALL: Finalizing...");
            finalize_reinstall(pool, task_id, meta).await?;
        }
        _ => {
            warn!("Unknown reinstall step: {}", step);
        }
    }
    
    Ok(())
}

/// Cleanup a damaged/failed VM creation
pub async fn cleanup_failed_vm(
    pool: &MySqlPool,
    instance_id: i64,
    client: &ProxmoxClient,
) -> Result<()> {
    // Get VM instance details
    let vm = sqlx::query("SELECT * FROM featherpanel_vm_instances WHERE id = ?")
        .bind(instance_id)
        .fetch_optional(pool)
        .await?;
    
    if let Some(vm_row) = vm {
        let vmid: i32 = vm_row.try_get("vmid").unwrap_or(0);
        let pve_node: String = vm_row.try_get("pve_node").unwrap_or_default();
        let vm_type_str: String = vm_row.try_get("vm_type").unwrap_or_else(|_| "qemu".to_string());
        let vm_type = VmType::from_str(&vm_type_str);
        
        if vmid > 0 && !pve_node.is_empty() {
            info!("🧹 Cleaning up damaged VM {} on node {}", vmid, pve_node);
            
            // Try to stop and delete the VM
            let _ = client.stop_vm(&pve_node, vmid as u32, vm_type).await;
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            let _ = client.delete_vm(&pve_node, vmid as u32, vm_type).await;
            
            info!("✅ Deleted damaged VM {} from Proxmox", vmid);
        }
        
        // Delete from database
        sqlx::query("DELETE FROM featherpanel_vm_instances WHERE id = ?")
            .bind(instance_id)
            .execute(pool)
            .await?;
        
        info!("✅ Removed VM instance {} from database", instance_id);
    }
    
    Ok(())
}

async fn apply_reinstall_config(
    pool: &MySqlPool,
    task_id: &str,
    task: &sqlx::mysql::MySqlRow,
    node: &str,
    vmid: u32,
    vm_type: VmType,
    meta: &Value,
    client: &ProxmoxClient,
) -> Result<()> {
    let user_uuid: String = task.try_get("user_uuid").unwrap_or_default();
    let default_hostname = format!("vm-{}", vmid);
    let hostname = meta["hostname"].as_str().unwrap_or(&default_hostname);
    
    let ip_address = meta["ip_address"].as_str().unwrap_or("");
    let ip_cidr = meta["ip_cidr"].as_i64().unwrap_or(24);
    let gateway = meta["gateway"].as_str().unwrap_or("");
    let memory = meta["memory"].as_i64().unwrap_or(512);
    let cpus = meta["cpus"].as_i64().unwrap_or(1);
    let cores = meta["cores"].as_i64().unwrap_or(1);
    
    let config = if vm_type.as_str() == "qemu" {
        let ci_user = meta["ci_user"].as_str().unwrap_or("debian");
        let ci_password = meta["ci_password"].as_str().unwrap_or("changeme");
        let root_disk = meta["root_disk"].as_str().unwrap_or("scsi0");
        let ipconfig = if gateway.is_empty() {
            format!("ip={}/{}", ip_address, ip_cidr)
        } else {
            format!("ip={}/{},gw={}", ip_address, ip_cidr, gateway)
        };
        
        json!({
            "memory": memory,
            "sockets": cpus,
            "cores": cores,
            "nameserver": "1.1.1.1 8.8.8.8",
            "ipconfig0": ipconfig,
            "boot": format!("order={}", root_disk),
            "ciuser": ci_user,
            "cipassword": ci_password,
            "tags": "FeatherPanel-Managed",
            "description": format!("FeatherPanel Managed VM (Reinstalled) | IP: {} | Hostname: {} | User: {} | Reinstalled: {}", 
                ip_address, hostname, user_uuid, chrono::Utc::now().format("%Y-%m-%d %H:%M:%S"))
        })
    } else {
        let bridge = meta["bridge"].as_str().unwrap_or("vmbr0");
        let net0 = if gateway.is_empty() {
            format!("name=eth0,bridge={},ip={}/{}", bridge, ip_address, ip_cidr)
        } else {
            format!("name=eth0,bridge={},ip={}/{},gw={}", bridge, ip_address, ip_cidr, gateway)
        };
        
        json!({
            "memory": memory,
            "cores": cpus * cores,
            "nameserver": "1.1.1.1 8.8.8.8",
            "net0": net0,
            "onboot": 0,
            "tags": "FeatherPanel-Managed",
            "description": format!("FeatherPanel Managed VM (Reinstalled) | IP: {} | Hostname: {} | User: {} | Reinstalled: {}", 
                ip_address, hostname, user_uuid, chrono::Utc::now().format("%Y-%m-%d %H:%M:%S"))
        })
    };
    
    client.set_vm_config(node, vmid, vm_type, &config).await?;
    
    // Move to backups step
    advance_step(pool, task_id, "backups").await?;
    Ok(())
}

async fn delete_instance_backups(
    pool: &MySqlPool,
    meta: &Value,
    client: &ProxmoxClient,
    node: &str,
) -> Result<()> {
    let instance_id = meta["instance_id"].as_i64().unwrap_or(0);
    
    if instance_id > 0 {
        let backups = sqlx::query("SELECT id, volid FROM featherpanel_vm_instance_backups WHERE vm_instance_id = ?")
            .bind(instance_id)
            .fetch_all(pool)
            .await?;
        
        for backup in &backups {
            let backup_id: i64 = backup.try_get("id").unwrap_or(0);
            let volid: String = backup.try_get("volid").unwrap_or_default();
            
            if !volid.is_empty() {
                info!("🗑️ Deleting backup: {}", volid);
                let storage = volid.split(':').next().unwrap_or("");
                if !storage.is_empty() {
                    let path = format!("/nodes/{}/storage/{}/content/{}", node, storage, urlencoding::encode(&volid));
                    let _ = client.delete(&path).await;
                }
            }
            
            let _ = sqlx::query("DELETE FROM featherpanel_vm_instance_backups WHERE id = ?")
                .bind(backup_id)
                .execute(pool)
                .await;
        }
        
        if !backups.is_empty() {
            info!("✅ Deleted {} backup(s)", backups.len());
        }
    }
    
    Ok(())
}

async fn cleanup_old_vm(
    pool: &MySqlPool,
    task_id: &str,
    meta: &Value,
    client: &ProxmoxClient,
    node: &str,
    vm_type: VmType,
) -> Result<()> {
    let old_vmid = meta["old_vmid"].as_i64().unwrap_or(0) as u32;
    let new_vmid = meta["vmid"].as_i64().or_else(|| meta["template_vmid"].as_i64()).unwrap_or(0) as u32;
    
    // Safety check: Don't delete if vmids are the same or invalid
    if old_vmid == 0 {
        warn!("⚠️ No old_vmid found, skipping cleanup");
        advance_step(pool, task_id, "update_db").await?;
        return Ok(());
    }
    
    if old_vmid == new_vmid {
        warn!("⚠️ old_vmid equals new_vmid ({}), skipping cleanup to prevent data loss", old_vmid);
        advance_step(pool, task_id, "update_db").await?;
        return Ok(());
    }
    
    info!("🗑️ Stopping and deleting old VM {}...", old_vmid);
    
    // Try to stop, but don't fail if already stopped
    match client.stop_vm(node, old_vmid, vm_type).await {
        Ok(_) => {
            info!("✅ Old VM {} stopped", old_vmid);
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        }
        Err(e) => {
            let error_msg = format!("{}", e);
            if error_msg.contains("not running") || error_msg.contains("already stopped") {
                info!("ℹ️ Old VM {} is already stopped", old_vmid);
            } else {
                warn!("⚠️ Failed to stop old VM: {}", e);
            }
        }
    }
    
    // Try to delete
    match client.delete_vm(node, old_vmid, vm_type).await {
        Ok(_) => info!("✅ Old VM {} deleted", old_vmid),
        Err(e) => {
            warn!("⚠️ Failed to delete old VM: {}", e);
            // Continue anyway - the new VM is working
        }
    }
    
    advance_step(pool, task_id, "update_db").await?;
    Ok(())
}

async fn update_reinstall_db(
    pool: &MySqlPool,
    task_id: &str,
    _task: &sqlx::mysql::MySqlRow,
    meta: &Value,
    node: &str,
    vmid: i32,
) -> Result<()> {
    let instance_id = meta["instance_id"].as_i64().unwrap_or(0);
    
    if instance_id > 0 {
        sqlx::query("UPDATE featherpanel_vm_instances SET vmid = ?, pve_node = ?, status = 'stopped' WHERE id = ?")
            .bind(vmid)
            .bind(node)
            .bind(instance_id)
            .execute(pool)
            .await?;
        
        info!("✅ Updated VM instance {} with new vmid {}", instance_id, vmid);
    }
    
    advance_step(pool, task_id, "start").await?;
    Ok(())
}

async fn finalize_reinstall(pool: &MySqlPool, task_id: &str, meta: &Value) -> Result<()> {
    if let Some(instance_id) = meta["instance_id"].as_i64() {
        sqlx::query("UPDATE featherpanel_vm_instances SET status = 'running' WHERE id = ?")
            .bind(instance_id)
            .execute(pool)
            .await?;
    }
    
    sqlx::query("UPDATE featherpanel_vm_tasks SET status = 'completed' WHERE task_id = ?")
        .bind(task_id)
        .execute(pool)
        .await?;
    
    info!("✅ REINSTALL task completed successfully");
    Ok(())
}
