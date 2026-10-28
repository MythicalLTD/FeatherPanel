//! SendGrid HTTP API controller (`sendgrid` crate).

use anyhow::{Result, anyhow};
use tracing::info;

use crate::mail::controller::MailController;
use crate::mail::helpers::{require_api_key, truncate_body};
use crate::types::MailConfig;

pub struct SendgridController;

impl MailController for SendgridController {
    fn id(&self) -> &'static str {
        "sendgrid"
    }

    fn name(&self) -> &'static str {
        "SendGrid"
    }

    async fn send(
        &self,
        config: &MailConfig,
        to: &str,
        subject: &str,
        body: &str,
    ) -> Result<()> {
        require_api_key(config, self.name())?;
        info!("Sending SendGrid API mail to {} (sendgrid crate)", to);
        let from = sendgrid::v3::Email::new(&config.from).set_name(&config.from_name);
        let personalization = sendgrid::v3::Personalization::new(sendgrid::v3::Email::new(to));
        let message = sendgrid::v3::Message::new(from)
            .set_subject(subject)
            .add_content(
                sendgrid::v3::Content::new()
                    .set_content_type("text/html")
                    .set_value(body),
            )
            .add_personalization(personalization);
        let sender = sendgrid::v3::Sender::new(config.api_key.trim(), None);
        let response = sender
            .send(&message)
            .await
            .map_err(|e| anyhow!("SendGrid permanent error: {}", e))?;
        let status = response.status();
        if !status.is_success() {
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow!(
                "SendGrid permanent error HTTP {}: {}",
                status.as_u16(),
                truncate_body(&text, 500)
            ));
        }
        info!(
            "SendGrid delivery accepted for {} (HTTP {})",
            to,
            status.as_u16()
        );
        Ok(())
    }
}
