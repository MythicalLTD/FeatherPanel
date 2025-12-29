// Server-related TypeScript interfaces

export interface ServerOwner {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  first_name?: string;
  last_name?: string;
}

export interface ServerAllocation {
  id: number;
  ip: string;
  port: number;
  alias?: string;
  ip_alias?: string;
}

export interface ServerNode {
  id: number;
  name: string;
  fqdn: string;
  scheme: string;
  maintenance_mode: boolean;
  behind_proxy: boolean;
  memory: number;
  memory_overallocate: number;
  disk: number;
  disk_overallocate: number;
  upload_size: number;
  daemon_listen: number;
  daemon_sftp: number;
  daemon_base: string;
  location_id: number;
  location?: ServerLocation;
}

export interface ServerLocation {
  id: number;
  name: string;
  description: string;
  flag_code?: string;
}

export interface ServerRealm {
  id: number;
  name: string;
  description?: string;
}

export interface ServerSpell {
  id: number;
  name: string;
  description?: string;
  banner?: string;
  icon?: string;
  author?: string;
  version?: string;
  docker_images?: string | Record<string, string>;
}

export interface ServerStats {
  memory_bytes: number;
  memory_limit_bytes: number;
  cpu_absolute: number;
  cpu_limit: number;
  disk_bytes: number;
  disk_limit_bytes: number;
  network_rx_bytes: number;
  network_tx_bytes: number;
  uptime: number;
  state: "running" | "starting" | "stopping" | "stopped" | "offline";
}

export interface Server {
  id: number;
  uuid: string;
  uuidShort: string;
  identifier: string;
  name: string;
  description?: string;
  status:
    | "installing"
    | "install_failed"
    | "suspended"
    | "restoring_backup"
    | "running"
    | "starting"
    | "stopping"
    | "stopped"
    | "offline";
  user_id: number;
  node_id: number;
  realm_id: number;
  spell_id: number;
  folder_id?: number | null;

  // Limits
  memory: number;
  swap: number;
  disk: number;
  io: number;
  cpu: number;
  threads?: string;

  // Network
  allocation_id: number;
  allocation_limit: number;
  database_limit: number;
  backup_limit: number;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relations
  owner?: ServerOwner;
  node?: ServerNode;
  location?: ServerLocation;
  realm?: ServerRealm;
  spell?: ServerSpell;
  stats?: ServerStats;
  allocation?: ServerAllocation;

  // Access control
  is_subuser: boolean;
  subuser_permissions?: string[];

  // Additional metadata
  docker_image?: string;
  startup?: string;
  environment?: Record<string, string>;
}

export interface ServerFolder {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  servers: Server[];
}

export type ViewMode =
  | "folders"
  | "list"
  | "table"
  | "compact"
  | "detailed"
  | "status-grouped"
  | "minimal";

export type ServerStatus = Server["status"];

export interface ServerFilters {
  search?: string;
  status?: ServerStatus;
  node_id?: number;
  realm_id?: number;
  spell_id?: number;
  folder_id?: number | null;
}

export interface ServersResponse {
  success: boolean;
  data: {
    servers: Server[];
    folders?: ServerFolder[];
    pagination?: {
      current_page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  };
  message?: string;
}
