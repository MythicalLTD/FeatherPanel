//! Resend HTTP API controller (official `resend-rs` SDK).

use anyhow::{Result, anyhow};
use tracing::info;

use crate::mail::controller::MailController;
use crate::mail::helpers::{from_header, require_api_key};
use crate::types::MailConfig;

pub struct ResendController;

impl MailController for ResendController {
    fn id(&self) -> &'static str {
        "resend"
    }

    fn name(&self) -> &'static str {
        "Resend"
    }

    async fn send(
        &self,
        config: &MailConfig,
        to: &str,
        subject: &str,
        body: &str,
    ) -> Result<()> {
        require_api_key(config, self.name())?;
        info!("Sending Resend API mail to {} (resend-rs SDK)", to);
        let client = resend_rs::Resend::new(config.api_key.trim());
        let email = resend_rs::types::CreateEmailBaseOptions::new(
            from_header(config),
            [to.to_string()],
            subject,
        )
        .with_html(body);
        client
            .emails
            .send(email)
            .await
            .map_err(|e| anyhow!("Resend permanent error: {}", e))?;
        info!("Resend delivery accepted for {}", to);
        Ok(())
    }
}
