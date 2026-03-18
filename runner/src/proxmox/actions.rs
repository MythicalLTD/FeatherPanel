use anyhow::Result;
use serde_json::{json, Value};
use tracing::info;

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
        let path = format!("/nodes/{}/{}/{}", node, vm_type.as_str(), vmid);
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
}
