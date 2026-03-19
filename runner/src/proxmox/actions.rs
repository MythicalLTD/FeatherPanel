use anyhow::Result;
use serde_json::{json, Value};
use tracing::info;
use std::collections::HashMap;

use super::client::ProxmoxClient;
use super::types::{PowerAction, TaskStatus, VmType};

impl ProxmoxClient {
    /// Clone a QEMU VM from template
    pub async fn clone_qemu(&self, node: &str, template_vmid: u32, newid: u32, name: &str, target: Option<&str>) -> Result<String> {
        let path = format!("/nodes/{}/qemu/{}/clone", node, template_vmid);
        let mut body = json!({
            "newid": newid,
            "name": name,
            "full": 1
        });
        
        if let Some(target_node) = target {
            body["target"] = json!(target_node);
        }
        
        let result = self.post(&path, &body).await?;
        let upid = result["data"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("No UPID in clone response"))?
            .to_string();
        
        info!("✅ Clone QEMU {} -> {} returned UPID: {}", template_vmid, newid, upid);
        Ok(upid)
    }
    
    /// Clone an LXC container from template
    pub async fn clone_lxc(&self, node: &str, template_vmid: u32, newid: u32, hostname: &str, target: Option<&str>, storage: &str) -> Result<String> {
        let path = format!("/nodes/{}/lxc/{}/clone", node, template_vmid);
        let mut body = json!({
            "newid": newid,
            "hostname": hostname,
            "full": 1,
            "storage": storage
        });
        
        if let Some(target_node) = target {
            body["target"] = json!(target_node);
        }
        
        let result = self.post(&path, &body).await?;
        let upid = result["data"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("No UPID in clone response"))?
            .to_string();
        
        info!("✅ Clone LXC {} -> {} returned UPID: {}", template_vmid, newid, upid);
        Ok(upid)
    }
    
    /// Execute a power action on a VM
    pub async fn power_action(&self, node: &str, vmid: u32, vm_type: VmType, action: PowerAction) -> Result<String> {
        let path = format!("/nodes/{}/{}/{}/status/{}", node, vm_type.as_str(), vmid, action.as_str());
        let result = self.post(&path, &json!({})).await?;
        
        // Extract UPID from response
        let upid = result["data"]
            .as_str()
            .unwrap_or("")
            .to_string();
        
        info!("✅ Power action {} on VM {} returned UPID: {}", action.as_str(), vmid, upid);
        Ok(upid)
    }
    
    /// Start a VM
    pub async fn start_vm(&self, node: &str, vmid: u32, vm_type: VmType) -> Result<String> {
        self.power_action(node, vmid, vm_type, PowerAction::Start).await
    }
    
    /// Stop a VM
    pub async fn stop_vm(&self, node: &str, vmid: u32, vm_type: VmType) -> Result<String> {
        self.power_action(node, vmid, vm_type, PowerAction::Stop).await
    }
    
    /// Reboot a VM
    pub async fn reboot_vm(&self, node: &str, vmid: u32, vm_type: VmType) -> Result<String> {
        self.power_action(node, vmid, vm_type, PowerAction::Reboot).await
    }
    
    /// Shutdown a VM gracefully
    pub async fn shutdown_vm(&self, node: &str, vmid: u32, vm_type: VmType) -> Result<String> {
        self.power_action(node, vmid, vm_type, PowerAction::Shutdown).await
    }
    
    /// Delete a VM
    pub async fn delete_vm(&self, node: &str, vmid: u32, vm_type: VmType) -> Result<String> {
        // IMPORTANT:
        // Proxmox "delete" without `purge=1` removes only the config but keeps underlying disk volumes.
        // We want reinstall/delete flows to clean up volumes (e.g. leftover cloud-init disks),
        // so we always purge volumes here.
        let path = format!(
            "/nodes/{}/{}/{}?purge=1",
            node,
            vm_type.as_str(),
            vmid
        );
        let result = self.delete(&path).await?;
        
        let upid = result["data"]
            .as_str()
            .unwrap_or("")
            .to_string();
        
        info!("✅ Delete VM {} returned UPID: {}", vmid, upid);
        Ok(upid)
    }
    
    /// Get VM configuration
    pub async fn get_vm_config(&self, node: &str, vmid: u32, vm_type: VmType) -> Result<Value> {
        let path = format!("/nodes/{}/{}/{}/config", node, vm_type.as_str(), vmid);
        let result = self.get(&path).await?;
        Ok(result["data"].clone())
    }

    /// Get the current power state for a VM or container.
    pub async fn get_vm_power_state(&self, node: &str, vmid: u32, vm_type: VmType) -> Result<String> {
        let path = format!("/nodes/{}/{}/{}/status/current", node, vm_type.as_str(), vmid);
        let result = self.get(&path).await?;

        Ok(result["data"]["status"]
            .as_str()
            .unwrap_or("unknown")
            .to_string())
    }
    
    /// Update VM configuration
    pub async fn set_vm_config(&self, node: &str, vmid: u32, vm_type: VmType, config: &Value) -> Result<()> {
        let path = format!("/nodes/{}/{}/{}/config", node, vm_type.as_str(), vmid);
        self.put(&path, config).await?;
        info!("✅ Updated VM {} config", vmid);
        Ok(())
    }
    
    /// Resize a disk
    pub async fn resize_disk(&self, node: &str, vmid: u32, vm_type: VmType, disk: &str, size: &str) -> Result<String> {
        let path = format!("/nodes/{}/{}/{}/resize", node, vm_type.as_str(), vmid);
        let body = json!({
            "disk": disk,
            "size": size
        });
        let result = self.put(&path, &body).await?;
        
        let upid = result["data"]
            .as_str()
            .unwrap_or("")
            .to_string();
        
        info!("✅ Resize disk {} on VM {} to {} returned UPID: {}", disk, vmid, size, upid);
        Ok(upid)
    }
    
    /// Get task status
    pub async fn get_task_status(&self, node: &str, upid: &str) -> Result<TaskStatus> {
        let path = format!("/nodes/{}/tasks/{}/status", node, urlencoding::encode(upid));
        let result = self.get(&path).await?;
        
        let data = &result["data"];
        Ok(TaskStatus {
            status: data["status"].as_str().unwrap_or("unknown").to_string(),
            exitstatus: data["exitstatus"].as_str().map(|s| s.to_string()),
        })
    }
    
    /// Wait for a task to complete
    pub async fn wait_task(&self, node: &str, upid: &str, timeout_secs: u64) -> Result<()> {
        let start = std::time::Instant::now();
        
        loop {
            if start.elapsed().as_secs() > timeout_secs {
                anyhow::bail!("Task timed out after {} seconds", timeout_secs);
            }
            
            let status = self.get_task_status(node, upid).await?;
            
            if status.is_stopped() {
                if status.is_ok() {
                    info!("✅ Task {} completed successfully", upid);
                    return Ok(());
                } else {
                    anyhow::bail!("Task failed with exit status: {:?}", status.exitstatus);
                }
            }
            
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        }
    }

    /// Query remote ISO/contents metadata using Proxmox `query-url-metadata` (extjs).
    /// Returns JSON-like object containing size, filename, mimetype.
    pub async fn query_iso_url_metadata(
        &self,
        node: &str,
        url: &str,
        verify_certificates: bool,
    ) -> Result<Value> {
        // Endpoint: GET /api2/extjs/nodes/{node}/query-url-metadata
        let path = format!("/nodes/{}/query-url-metadata", node);

        let mut query: HashMap<String, String> = HashMap::new();
        query.insert("url".to_string(), url.to_string());
        query.insert(
            "verify-certificates".to_string(),
            if verify_certificates { "1" } else { "0" }.to_string(),
        );
        // extjs endpoints often expect `_dc` (cache busting) even though it's not strictly documented.
        query.insert(
            "_dc".to_string(),
            chrono::Utc::now().timestamp_millis().to_string(),
        );

        self.get_extjs(&path, &query).await
    }

    /// Download an ISO from a URL directly on Proxmox into an ISO-capable storage.
    /// Returns an UPID (async task id).
    pub async fn download_iso_url_to_storage(
        &self,
        node: &str,
        storage: &str,
        url: &str,
        filename: &str,
        verify_certificates: bool,
    ) -> Result<String> {
        // Endpoint: POST /api2/extjs/nodes/{node}/storage/{storage}/download-url
        let path = format!("/nodes/{}/storage/{}/download-url", node, storage);

        let mut form: HashMap<String, String> = HashMap::new();
        form.insert("content".to_string(), "iso".to_string());
        form.insert("url".to_string(), url.to_string());
        form.insert("filename".to_string(), filename.to_string());
        form.insert(
            "verify-certificates".to_string(),
            if verify_certificates { "1" } else { "0" }.to_string(),
        );

        let result = self.post_extjs_form(&path, &form).await?;
        let upid = result["data"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("No UPID in download-url response"))?;

        Ok(upid.to_string())
    }

    /// Unlink (detach/delete) one or more qemu disks from a VM.
    /// Used to remove existing cdrom devices (media=cdrom) so only one ISO is attached.
    pub async fn unlink_qemu_disks(&self, node: &str, vmid: u32, ids: &[String]) -> Result<()> {
        if ids.is_empty() {
            return Ok(());
        }

        let path = format!("/nodes/{}/qemu/{}/unlink", node, vmid);
        let body = json!({ "idlist": ids.join(",") });
        let _ = self.put(&path, &body).await?;
        Ok(())
    }
}
