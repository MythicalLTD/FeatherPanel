use anyhow::{anyhow, Result};
use reqwest::Client;
use serde_json::{json, Value};
use sqlx::{MySqlPool, Row};
use tracing::{info, warn};

pub struct FeatherTailCreds {
    pub base_url: String,
    pub token: String,
    pub tls_no_verify: bool,
}

pub fn load_creds_from_node(node: &sqlx::mysql::MySqlRow, encryption_key: &str) -> Result<Option<FeatherTailCreds>> {
    let enabled: i8 = node.try_get("feathertail_enabled").unwrap_or(0);
    if enabled == 0 {
        return Ok(None);
    }

    let base_url: String = node.try_get("feathertail_url").unwrap_or_default();
    let enc_token: String = node.try_get("feathertail_token").unwrap_or_default();
    let tls_raw: i8 = node.try_get("feathertail_tls_no_verify").unwrap_or(0);

    if base_url.trim().is_empty() || enc_token.trim().is_empty() {
        return Err(anyhow!(
            "FeatherTail is enabled but URL/token is missing on this VDS node"
        ));
    }

    let encryptor = crate::encryption::Encryptor::new(encryption_key)?;
    let token = encryptor.decrypt(&enc_token)?;

    Ok(Some(FeatherTailCreds {
        base_url: base_url.trim_end_matches('/').to_string(),
        token,
        tls_no_verify: tls_raw != 0,
    }))
}

fn build_client(tls_no_verify: bool) -> Result<Client> {
    Client::builder()
        .danger_accept_invalid_certs(tls_no_verify)
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| anyhow!("FeatherTail HTTP client: {e}"))
}

pub async fn assign_lease(
    creds: &FeatherTailCreds,
    vmid: u32,
    hostname: &str,
    ip: &str,
    gateway: &str,
    cidr: i32,
) -> Result<Value> {
    let client = build_client(creds.tls_no_verify)?;
    let url = format!("{}/api/v1/dhcp/leases", creds.base_url);
    let body = json!({
        "vmid": vmid,
        "hostname": hostname,
        "ip": ip,
        "gateway": if gateway.is_empty() { "0.0.0.0" } else { gateway },
        "cidr": if cidr > 0 { cidr } else { 24 },
        "dns_servers": ["1.1.1.1", "8.8.8.8"],
    });

    let res = client
        .post(&url)
        .bearer_auth(&creds.token)
        .json(&body)
        .send()
        .await?;

    let status = res.status();
    let text = res.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(anyhow!(
            "FeatherTail assign lease failed HTTP {}: {}",
            status.as_u16(),
            text
        ));
    }

    let parsed: Value = serde_json::from_str(&text).unwrap_or(json!({ "raw": text }));
    info!("✅ FeatherTail lease assigned for VMID {} → {}", vmid, ip);
    Ok(parsed)
}

pub async fn delete_lease(creds: &FeatherTailCreds, vmid: u32) -> Result<()> {
    let client = build_client(creds.tls_no_verify)?;
    let url = format!("{}/api/v1/dhcp/leases/vm/{}", creds.base_url, vmid);
    let res = client
        .delete(&url)
        .bearer_auth(&creds.token)
        .send()
        .await?;

    let status = res.status();
    let text = res.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(anyhow!(
            "FeatherTail delete lease failed HTTP {}: {}",
            status.as_u16(),
            text
        ));
    }

    info!("✅ FeatherTail lease removed for VMID {}", vmid);
    Ok(())
}

pub async fn set_lxc_root_password(creds: &FeatherTailCreds, vmid: u32, password: &str) -> Result<()> {
    let client = build_client(creds.tls_no_verify)?;
    let url = format!("{}/api/v1/containers/{}/root-password", creds.base_url, vmid);
    let res = client
        .post(&url)
        .bearer_auth(&creds.token)
        .json(&json!({ "password": password }))
        .send()
        .await?;

    let status = res.status();
    let text = res.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(anyhow!(
            "FeatherTail set LXC root password failed HTTP {}: {}",
            status.as_u16(),
            text
        ));
    }

    info!("✅ FeatherTail set LXC root password for VMID {}", vmid);
    Ok(())
}

/// True when the primary pool IP (or any network) uses assignment_mode=dhcp.
pub fn meta_uses_dhcp(meta: &Value) -> bool {
    if meta["uses_dhcp"].as_bool().unwrap_or(false) {
        return true;
    }
    if let Some(networks) = meta["networks"].as_array() {
        return networks.iter().any(|n| {
            n["assignment_mode"].as_str().unwrap_or("static") == "dhcp"
        });
    }
    false
}

pub async fn instance_uses_dhcp_ip(pool: &MySqlPool, instance_id: i64) -> Result<bool> {
    if instance_id <= 0 {
        return Ok(false);
    }
    let row = sqlx::query(
        "SELECT vip.assignment_mode
         FROM featherpanel_vm_instances vi
         LEFT JOIN featherpanel_vm_ips vip ON vip.id = vi.vm_ip_id
         WHERE vi.id = ?",
    )
    .bind(instance_id)
    .fetch_optional(pool)
    .await?;

    Ok(row
        .and_then(|r| r.try_get::<String, _>("assignment_mode").ok())
        .map(|m| m == "dhcp")
        .unwrap_or(false))
}

pub fn warn_lease_err(context: &str, err: anyhow::Error) {
    warn!("⚠️ FeatherTail {}: {}", context, err);
}
