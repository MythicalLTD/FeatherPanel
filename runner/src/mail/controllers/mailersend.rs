//! MailerSend HTTP API controller.

use anyhow::{Context, Result};
use serde_json::json;
use tracing::info;

use crate::mail::controller::MailController;
use crate::mail::helpers::{HTTP_CLIENT, ensure_http_ok, require_api_key};
use crate::types::MailConfig;

pub struct MailerSendController;

impl MailController for MailerSendController {
    fn id(&self) -> &'static str {
        "mailersend"
    }

    fn name(&self) -> &'static str {
        "MailerSend"
    }

    async fn send(
        &self,
        config: &MailConfig,
        to: &str,
        subject: &str,
        body: &str,
    ) -> Result<()> {
        // No maintained MailerSend Rust SDK on crates.io suitable for production.
        require_api_key(config, self.name())?;
        info!("Sending MailerSend API mail to {}", to);
        let response = HTTP_CLIENT
            .post("https://api.mailersend.com/v1/email")
            .bearer_auth(&config.api_key)
            .json(&json!({
                "from": { "email": config.from, "name": config.from_name },
                "to": [{ "email": to }],
                "subject": subject,
                "html": body,
            }))
            .send()
            .await
            .context("MailerSend API request failed")?;
        ensure_http_ok(self.name(), response).await
    }
}
