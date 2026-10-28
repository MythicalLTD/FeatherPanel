use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct MailNotification {
    pub queue_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VmNotification {
    pub task_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingsReloadNotification {
    pub reason: Option<String>,
}

#[derive(Clone, Debug)]
pub struct MailConfig {
    /// smtp | resend | sendgrid | mailgun | postmark | brevo | mailersend | sparkpost | ses
    pub transport: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub pass: String,
    pub from: String,
    pub from_name: String,
    pub encryption: String,
    pub enabled: bool,
    pub api_key: String,
    pub api_domain: String,
    pub api_region: String,
}

/// Backward-compatible alias used by older call sites.
pub type SmtpConfig = MailConfig;

#[derive(Debug)]
pub struct MailQueueEntry {
    pub subject: String,
    pub body: String,
}

#[derive(Debug)]
pub struct MailListEntry {
    pub user_uuid: String,
}

#[derive(Debug)]
pub struct UserEntry {
    pub email: String,
}
