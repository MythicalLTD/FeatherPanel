//! Mailgun HTTP API controller (v3 form API).

use anyhow::{Context, Result, anyhow};
use tracing::info;

use crate::mail::controller::MailController;
use crate::mail::helpers::{HTTP_CLIENT, ensure_http_ok, from_header, require_api_key};
use crate::types::MailConfig;

pub struct MailgunController;

impl MailController for MailgunController {
    fn id(&self) -> &'static str {
        "mailgun"
    }

    fn name(&self) -> &'static str {
        "Mailgun"
    }

    async fn send(
        &self,
        config: &MailConfig,
        to: &str,
        subject: &str,
        body: &str,
    ) -> Result<()> {
        // mailgun_v3 is stale (last publish 2023); use documented v3 form API.
        require_api_key(config, self.name())?;
        let domain = config.api_domain.trim();
        if domain.is_empty() {
            return Err(anyhow!("Mailgun requires mail_api_domain"));
        }
        let region = config.api_region.to_ascii_lowercase();
        let base = if region == "eu" {
            "https://api.eu.mailgun.net"
        } else {
            "https://api.mailgun.net"
        };
        let url = format!("{}/v3/{}/messages", base, domain);
        let from = from_header(config);
        info!("Sending Mailgun API mail to {} via {}", to, domain);
        let response = HTTP_CLIENT
            .post(&url)
            .basic_auth("api", Some(&config.api_key))
            .form(&[
                ("from", from.as_str()),
                ("to", to),
                ("subject", subject),
                ("html", body),
            ])
            .send()
            .await
            .context("Mailgun API request failed")?;
        ensure_http_ok(self.name(), response).await
    }
}
