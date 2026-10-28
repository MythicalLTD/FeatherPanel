//! Postmark HTTP API controller (`postmark` crate).

use anyhow::{Result, anyhow};
use tracing::info;

use crate::mail::controller::MailController;
use crate::mail::helpers::{from_header, require_api_key};
use crate::types::MailConfig;

pub struct PostmarkController;

impl MailController for PostmarkController {
    fn id(&self) -> &'static str {
        "postmark"
    }

    fn name(&self) -> &'static str {
        "Postmark"
    }

    async fn send(
        &self,
        config: &MailConfig,
        to: &str,
        subject: &str,
        body: &str,
    ) -> Result<()> {
        require_api_key(config, self.name())?;
        info!("Sending Postmark API mail to {} (postmark crate)", to);
        let client = postmark::reqwest::PostmarkClient::builder()
            .base_url("https://api.postmarkapp.com/")
            .server_token(config.api_key.trim())
            .build();
        let req = postmark::api::email::SendEmailRequest::builder()
            .from(from_header(config))
            .to(to.to_string())
            .subject(subject.to_string())
            .body(postmark::api::Body::html(body.to_string()))
            .build();
        use postmark::Query;
        let resp = req
            .execute(&client)
            .await
            .map_err(|e| anyhow!("Postmark permanent error: {}", e))?;
        if resp.error_code != 0 {
            return Err(anyhow!(
                "Postmark permanent error code {}: {}",
                resp.error_code,
                resp.message
            ));
        }
        info!("Postmark delivery accepted for {}", to);
        Ok(())
    }
}
