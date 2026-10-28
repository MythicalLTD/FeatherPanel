//! Mail controller trait — one implementor per outbound transport.

use anyhow::Result;
use std::future::Future;

use crate::types::MailConfig;

/// Contract every outbound mail provider controller must implement.
pub trait MailController: Send + Sync {
    /// Stable transport id (matches `mail_transport` setting).
    fn id(&self) -> &'static str;

    /// Human-readable provider name for logs / errors.
    fn name(&self) -> &'static str;

    /// Deliver one HTML email.
    fn send<'a>(
        &'a self,
        config: &'a MailConfig,
        to: &'a str,
        subject: &'a str,
        body: &'a str,
    ) -> impl Future<Output = Result<()>> + Send + 'a;
}
