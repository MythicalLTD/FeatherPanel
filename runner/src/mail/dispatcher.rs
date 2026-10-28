//! Resolves `mail_transport` to a controller and sends.

use anyhow::{Result, anyhow};
use tracing::debug;

use super::controller::MailController;
use super::controllers::{
    BrevoController, MailerSendController, MailgunController, PostmarkController, ResendController,
    SesController, SendgridController, SmtpController, SparkPostController,
};
use crate::types::MailConfig;

/// Facade that picks the right [`MailController`] for a config.
pub struct MailDispatcher;

impl MailDispatcher {
    pub async fn send(config: &MailConfig, to: &str, subject: &str, body: &str) -> Result<()> {
        let transport = config.transport.to_ascii_lowercase();
        match transport.as_str() {
            "smtp" | "" => Self::dispatch(&SmtpController, config, to, subject, body).await,
            "resend" => Self::dispatch(&ResendController, config, to, subject, body).await,
            "sendgrid" => Self::dispatch(&SendgridController, config, to, subject, body).await,
            "mailgun" => Self::dispatch(&MailgunController, config, to, subject, body).await,
            "postmark" => Self::dispatch(&PostmarkController, config, to, subject, body).await,
            "brevo" => Self::dispatch(&BrevoController, config, to, subject, body).await,
            "mailersend" => Self::dispatch(&MailerSendController, config, to, subject, body).await,
            "sparkpost" => Self::dispatch(&SparkPostController, config, to, subject, body).await,
            "ses" => Self::dispatch(&SesController, config, to, subject, body).await,
            other => Err(anyhow!("Unsupported mail_transport '{}'", other)),
        }
    }

    async fn dispatch<C: MailController>(
        controller: &C,
        config: &MailConfig,
        to: &str,
        subject: &str,
        body: &str,
    ) -> Result<()> {
        debug!(
            "MailDispatcher using controller id={} name={}",
            controller.id(),
            controller.name()
        );
        controller.send(config, to, subject, body).await
    }
}
