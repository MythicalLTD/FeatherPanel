use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct MailNotification {
    pub queue_id: String,
}

#[derive(Clone, Debug)]
pub struct SmtpConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub pass: String,
    pub from: String,
    pub from_name: String,
    pub encryption: String,
    pub enabled: bool,
}

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
