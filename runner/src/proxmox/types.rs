/// Power action types
#[derive(Debug, Clone, Copy)]
pub enum PowerAction {
    Start,
    Stop,
    Shutdown,
    Reboot,
    Reset,
    Suspend,
    Resume,
}

impl PowerAction {
    pub fn as_str(&self) -> &str {
        match self {
            PowerAction::Start => "start",
            PowerAction::Stop => "stop",
            PowerAction::Shutdown => "shutdown",
            PowerAction::Reboot => "reboot",
            PowerAction::Reset => "reset",
            PowerAction::Suspend => "suspend",
            PowerAction::Resume => "resume",
        }
    }
}

/// VM type (QEMU or LXC)
#[derive(Debug, Clone, Copy)]
pub enum VmType {
    Qemu,
    Lxc,
}

impl VmType {
    pub fn as_str(&self) -> &str {
        match self {
            VmType::Qemu => "qemu",
            VmType::Lxc => "lxc",
        }
    }
    
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "lxc" | "container" => VmType::Lxc,
            _ => VmType::Qemu,
        }
    }
}

/// Task status response
#[derive(Debug)]
pub struct TaskStatus {
    pub status: String,
    pub exitstatus: Option<String>,
}

impl TaskStatus {
    pub fn is_stopped(&self) -> bool {
        self.status == "stopped"
    }
    
    pub fn is_ok(&self) -> bool {
        self.exitstatus.as_deref() == Some("OK")
    }
}
