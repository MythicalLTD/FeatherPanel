//! SparkPost HTTP API controller.

use anyhow::{Context, Result};
use serde_json::json;
use tracing::info;

use crate::mail::controller::MailController;
use crate::mail::helpers::{HTTP_CLIENT, ensure_http_ok, require_api_key};
use crate::types::MailConfig;

pub struct SparkPostController;

impl MailController for SparkPostController {
    fn id(&self) -> &'static str {
        "sparkpost"
    }

    fn name(&self) -> &'static str {
        "SparkPost"
    }

    async fn send(
        &self,
        config: &MailConfig,
        to: &str,
        subject: &str,
        body: &str,
    ) -> Result<()> {
        // crates.io `sparkpost` last published 2020 - keep a thin HTTP client instead.
        require_api_key(config, self.name())?;
        let region = config.api_region.to_ascii_lowercase();
        let base = if region == "eu" {
            "https://api.eu.sparkpost.com"
        } else {
            "https://api.sparkpost.com"
        };
        let url = format!("{}/api/v1/transmissions", base);
        info!("Sending SparkPost API mail to {}", to);
        let response = HTTP_CLIENT
            .post(&url)
            .header("Authorization", &config.api_key)
            .json(&json!({
                "content": {
                    "from": { "email": config.from, "name": config.from_name },
                    "subject": subject,
                    "html": body,
                },
                "recipients": [{ "address": { "email": to } }],
            }))
            .send()
            .await
            .context("SparkPost API request failed")?;
        ensure_http_ok(self.name(), response).await
    }
}
