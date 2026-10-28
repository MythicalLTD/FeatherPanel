//! Amazon SES HTTP API controller (official `aws-sdk-sesv2`).

use anyhow::{Context, Result, anyhow};
use tracing::info;

use crate::mail::controller::MailController;
use crate::mail::helpers::{from_header, require_api_key, split_ses_credentials};
use crate::types::MailConfig;

pub struct SesController;

impl MailController for SesController {
    fn id(&self) -> &'static str {
        "ses"
    }

    fn name(&self) -> &'static str {
        "Amazon SES"
    }

    async fn send(
        &self,
        config: &MailConfig,
        to: &str,
        subject: &str,
        body: &str,
    ) -> Result<()> {
        require_api_key(config, self.name())?;
        let region = config.api_region.trim();
        if region.is_empty() {
            return Err(anyhow!("Amazon SES requires mail_api_region (e.g. us-east-1)"));
        }
        let (access_key, secret_key) = split_ses_credentials(&config.api_key)?;

        info!(
            "Sending Amazon SES API mail to {} (aws-sdk-sesv2, region={})",
            to, region
        );

        let credentials =
            aws_credential_types::Credentials::from_keys(access_key, secret_key, None);
        let sdk_config = aws_sdk_sesv2::Config::builder()
            .behavior_version(aws_config::BehaviorVersion::latest())
            .region(aws_sdk_sesv2::config::Region::new(region.to_string()))
            .credentials_provider(credentials)
            .build();
        let client = aws_sdk_sesv2::Client::from_conf(sdk_config);

        let subject_content = aws_sdk_sesv2::types::Content::builder()
            .data(subject)
            .charset("UTF-8")
            .build()
            .context("SES subject Content build failed")?;
        let html_content = aws_sdk_sesv2::types::Content::builder()
            .data(body)
            .charset("UTF-8")
            .build()
            .context("SES html Content build failed")?;
        let body_content = aws_sdk_sesv2::types::Body::builder()
            .html(html_content)
            .build();
        let message = aws_sdk_sesv2::types::Message::builder()
            .subject(subject_content)
            .body(body_content)
            .build();
        let email_content = aws_sdk_sesv2::types::EmailContent::builder()
            .simple(message)
            .build();
        let destination = aws_sdk_sesv2::types::Destination::builder()
            .to_addresses(to)
            .build();

        client
            .send_email()
            .from_email_address(from_header(config))
            .destination(destination)
            .content(email_content)
            .send()
            .await
            .map_err(|e| anyhow!("Amazon SES permanent error: {}", e))?;

        info!("Amazon SES delivery accepted for {}", to);
        Ok(())
    }
}
