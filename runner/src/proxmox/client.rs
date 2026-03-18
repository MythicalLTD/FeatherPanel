use anyhow::{Context, Result};
use reqwest::{Client, ClientBuilder, header::{HeaderMap, HeaderName, HeaderValue, AUTHORIZATION}};
use serde_json::Value;

/// Proxmox API client with authentication and custom headers
#[derive(Clone)]
pub struct ProxmoxClient {
    client: Client,
    base_url: String,
    extjs_base_url: String,
    extra_params: std::collections::HashMap<String, String>,
}

impl ProxmoxClient {
    /// Create a new Proxmox client with API token authentication
    /// 
    /// # Arguments
    /// * `fqdn` - Proxmox hostname
    /// * `port` - API port (usually 8006 or 443)
    /// * `scheme` - http or https
    /// * `user` - Proxmox user (e.g., root@pam)
    /// * `token_id` - API token ID
    /// * `token_secret` - API token secret
    /// * `tls_no_verify` - Skip TLS verification
    /// * `extra_headers` - Additional headers (e.g., Cloudflare Access)
    /// * `extra_params` - Additional query parameters
    pub fn new(
        fqdn: &str,
        port: u16,
        scheme: &str,
        user: &str,
        token_id: &str,
        token_secret: &str,
        tls_no_verify: bool,
        extra_headers: std::collections::HashMap<String, String>,
        extra_params: std::collections::HashMap<String, String>,
    ) -> Result<Self> {
        let base_url = format!("{}://{}:{}/api2/json", scheme, fqdn, port);
        let extjs_base_url = format!("{}://{}:{}/api2/extjs", scheme, fqdn, port);
        
        let mut headers = HeaderMap::new();
        
        // Add Proxmox API Token authentication: PVEAPIToken=user!tokenId=secret
        if !user.is_empty() && !token_id.is_empty() && !token_secret.is_empty() {
            let auth_value = format!("PVEAPIToken={}!{}={}", user, token_id, token_secret);
            tracing::debug!("🔑 Proxmox auth: PVEAPIToken={}!{}=[SECRET]", user, token_id);
            headers.insert(
                AUTHORIZATION,
                HeaderValue::from_str(&auth_value)?,
            );
        } else {
            tracing::warn!("⚠️ Missing Proxmox credentials");
        }

        // Add custom headers (Cloudflare Access, etc.)
        for (k, v) in extra_headers {
            if let (Ok(name), Ok(value)) = (HeaderName::from_bytes(k.as_bytes()), HeaderValue::from_str(&v)) {
                let display_val = if k.to_lowercase().contains("secret") { "[REDACTED]" } else { &v };
                tracing::debug!("📋 Header: {} = {}", k, display_val);
                headers.insert(name, value);
            }
        }
        
        let mut builder = ClientBuilder::new().default_headers(headers);
        if tls_no_verify {
            tracing::warn!("⚠️ TLS verification disabled");
            builder = builder.danger_accept_invalid_certs(true);
        }
        
        Ok(Self {
            client: builder.build()?,
            base_url,
            extjs_base_url,
            extra_params,
        })
    }
    
    /// Make a GET request to Proxmox API
    pub async fn get(&self, path: &str) -> Result<Value> {
        let url = format!("{}{}", self.base_url, path);
        tracing::debug!("🌐 GET {}", url);
        
        let res = self.client.get(&url).query(&self.extra_params).send().await?;
        self.handle_response(res, &url).await
    }
    
    /// Make a POST request to Proxmox API
    pub async fn post(&self, path: &str, body: &Value) -> Result<Value> {
        let url = format!("{}{}", self.base_url, path);
        tracing::debug!("🌐 POST {}", url);
        
        let res = self.client.post(&url).query(&self.extra_params).json(body).send().await?;
        self.handle_response(res, &url).await
    }
    
    /// Make a PUT request to Proxmox API
    pub async fn put(&self, path: &str, body: &Value) -> Result<Value> {
        let url = format!("{}{}", self.base_url, path);
        tracing::debug!("🌐 PUT {}", url);
        
        let res = self.client.put(&url).query(&self.extra_params).json(body).send().await?;
        self.handle_response(res, &url).await
    }
    
    /// Make a DELETE request to Proxmox API
    pub async fn delete(&self, path: &str) -> Result<Value> {
        let url = format!("{}{}", self.base_url, path);
        tracing::debug!("🌐 DELETE {}", url);
        
        let res = self.client.delete(&url).query(&self.extra_params).send().await?;
        self.handle_response(res, &url).await
    }
    
    /// Handle Proxmox API response
    async fn handle_response(&self, res: reqwest::Response, url: &str) -> Result<Value> {
        let status = res.status();
        let body_text = res.text().await.unwrap_or_else(|_| "Unable to read response".to_string());
        
        if !status.is_success() {
            tracing::error!("❌ HTTP {} - Response: {}", status, body_text);
            anyhow::bail!("HTTP {} for {} - Response: {}", status, url, body_text);
        }
        
        tracing::debug!("✅ Response: {}", body_text);
        let json: Value = serde_json::from_str(&body_text)
            .context(format!("Failed to parse JSON: {}", body_text))?;
        Ok(json)
    }

    /// Make a GET request against a Proxmox `/api2/extjs/...` endpoint.
    pub async fn get_extjs(&self, path: &str, query: &std::collections::HashMap<String, String>) -> Result<Value> {
        let url = format!("{}{}", self.extjs_base_url, path);
        tracing::debug!("🌐 EXTJS GET {}", url);

        let mut merged = self.extra_params.clone();
        for (k, v) in query {
            merged.insert(k.clone(), v.clone());
        }

        let res = self.client.get(&url).query(&merged).send().await?;
        self.handle_response(res, &url).await
    }

    /// Make a POST request against a Proxmox `/api2/extjs/...` endpoint with form params.
    pub async fn post_extjs_form(
        &self,
        path: &str,
        form: &std::collections::HashMap<String, String>,
    ) -> Result<Value> {
        let url = format!("{}{}", self.extjs_base_url, path);
        tracing::debug!("🌐 EXTJS POST (form) {}", url);

        // Keep any default query params configured on the client.
        let res = self
            .client
            .post(&url)
            .query(&self.extra_params)
            .form(form)
            .send()
            .await?;

        self.handle_response(res, &url).await
    }
}
