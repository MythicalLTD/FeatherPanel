//! Brevo HTTP API controller.

use anyhow::{Context, Result};
use serde_json::json;
use tracing::info;

use crate::mail::controller::MailController;
use crate::mail::helpers::{HTTP_CLIENT, ensure_http_ok, require_api_key};
use crate::types::MailConfig;

pub struct BrevoController;

impl MailController for BrevoController {
    fn id(&self) -> &'static str {
        "brevo"
    }

    fn name(&self) -> &'static str {
        "Brevo"
    }

    async fn send(
        &self,
        config: &MailConfig,
        to: &str,
        subject: &str,
        body: &str,
    ) -> Result<()> {
        // No production-grade Brevo Rust SDK yet (brevo-v3 is brand new / tiny).
        require_api_key(config, self.name())?;
        info!("Sending Brevo API mail to {}", to);
        let response = HTTP_CLIENT
            .post("https://api.brevo.com/v3/smtp/email")
            .header("api-key", &config.api_key)
            .header("accept", "application/json")
            .json(&json!({
                "sender": { "email": config.from, "name": config.from_name },
                "to": [{ "email": to }],
                "subject": subject,
                "htmlContent": body,
            }))
            .send()
            .await
            .context("Brevo API request failed")?;
        ensure_http_ok(self.name(), response).await
    }
}
