//! Shared helpers for mail controllers.

use anyhow::{Result, anyhow};
use once_cell::sync::Lazy;
use tracing::info;

use crate::types::MailConfig;

pub static HTTP_CLIENT: Lazy<reqwest::Client> = Lazy::new(|| {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .user_agent("FeatherPanel-async-runner/1.5")
        .build()
        .expect("failed to build HTTP client for mail providers")
});

/// Sanitise a display name for use in an RFC 5322 `From` header.
pub fn sanitize_display_name(name: &str) -> String {
    let needs_quoting = name.chars().any(|c| {
        matches!(
            c,
            '(' | ')' | '<' | '>' | '[' | ']' | ':' | ';' | '@' | '\\' | ',' | '.' | '"'
        ) || !c.is_ascii()
            || c.is_ascii_control()
    });

    if needs_quoting {
        let escaped = name.replace('\\', "\\\\").replace('"', "\\\"");
        format!("\"{}\"", escaped)
    } else {
        name.to_string()
    }
}

pub fn from_header(config: &MailConfig) -> String {
    format!("{} <{}>", sanitize_display_name(&config.from_name), config.from)
}

pub fn truncate_body(body: &str, max: usize) -> String {
    let trimmed = body.trim();
    if trimmed.chars().count() <= max {
        return trimmed.to_string();
    }
    let shortened: String = trimmed.chars().take(max).collect();
    format!("{}…", shortened)
}

pub async fn ensure_http_ok(provider: &str, response: reqwest::Response) -> Result<()> {
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    if status.is_success() {
        info!("{} delivery accepted (HTTP {})", provider, status.as_u16());
        return Ok(());
    }
    Err(anyhow!(
        "{} permanent error HTTP {}: {}",
        provider,
        status.as_u16(),
        truncate_body(&body, 500)
    ))
}

pub fn require_api_key(config: &MailConfig, provider: &str) -> Result<()> {
    if config.api_key.trim().is_empty() {
        return Err(anyhow!("{} requires mail_api_key", provider));
    }
    Ok(())
}

pub fn split_ses_credentials(api_key: &str) -> Result<(&str, &str)> {
    let (access, secret) = api_key
        .split_once(':')
        .ok_or_else(|| anyhow!("Amazon SES mail_api_key must be ACCESS_KEY:SECRET_KEY"))?;
    if access.is_empty() || secret.is_empty() {
        return Err(anyhow!("Amazon SES mail_api_key must be ACCESS_KEY:SECRET_KEY"));
    }
    Ok((access, secret))
}
