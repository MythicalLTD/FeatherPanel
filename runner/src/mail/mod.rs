//! Panel outbound mail delivery.
//!
//! Layout:
//! - [`controller`] - `MailController` trait
//! - [`controllers`] - one controller struct per transport
//! - [`dispatcher`] - resolves `mail_transport` and calls the controller
//! - [`helpers`] - shared From headers / HTTP client / API key checks
//!
//! Strategy:
//! - SMTP: lettre
//! - Resend: official `resend-rs`
//! - SendGrid: community `sendgrid`
//! - Postmark: community `postmark`
//! - Amazon SES: official `aws-sdk-sesv2`
//! - Mailgun / Brevo / MailerSend / SparkPost: thin reqwest clients

mod controller;
mod controllers;
mod dispatcher;
mod helpers;

use anyhow::Result;

use crate::types::MailConfig;
use dispatcher::MailDispatcher;

/// Public entry point used by the mail processor.
pub async fn send_email(config: &MailConfig, to: &str, subject: &str, body: &str) -> Result<()> {
    MailDispatcher::send(config, to, subject, body).await
}
