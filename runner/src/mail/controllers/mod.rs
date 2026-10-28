//! Per-provider mail controllers.

mod brevo;
mod mailersend;
mod mailgun;
mod postmark;
mod resend;
mod sendgrid;
mod ses;
mod smtp;
mod sparkpost;

pub use brevo::BrevoController;
pub use mailersend::MailerSendController;
pub use mailgun::MailgunController;
pub use postmark::PostmarkController;
pub use resend::ResendController;
pub use sendgrid::SendgridController;
pub use ses::SesController;
pub use smtp::SmtpController;
pub use sparkpost::SparkPostController;
