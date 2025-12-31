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
  startup?: string;
  realm_id?: number;
}

export interface Variable {
  id: number;
  server_id: number;
  variable_id: number;
  variable_value: string;
  name: string;
  description: string;
  env_variable: string;
  default_value: string;
  user_viewable: number;
  user_editable: number;
  rules: string;
  field_type: string;
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
  owner_id: number;
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
  current_allocations?: number;
  can_add_more?: boolean;
  primary_allocation_id?: number;
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
  image?: string;
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

export interface DatabaseFilters {
  search?: string;
}

export interface Database {
  id: number;
  server_id: number;
  database_host_id: number;
  database: string;
  username: string;
  remote: string;
  password?: string;
  max_connections: number;
  created_at: string;
  updated_at: string;
  database_host?: string;
  database_port?: number;
  database_type?: string;
  host_name?: string;
}

export interface DatabaseHost {
  id: number;
  name: string;
  database_type: string;
  database_host: string;
  database_port: number;
}

export interface DatabasesResponse {
  success: boolean;
  data: {
    data: Database[];
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
      from: number;
      to: number;
    };
  };
  message?: string;
}
export interface BackupFilters {
  search?: string;
}

export interface BackupItem {
  id: number;
  server_id: number;
  uuid: string;
  name: string;
  ignored_files: string;
  disk: string;
  is_successful: number;
  is_locked: number;
  bytes: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface BackupsResponse {
  success: boolean;
  data: {
    data: BackupItem[];
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
      from: number;
      to: number;
    };
  };
  message?: string;
}
export interface ImportItem {
  id: number;
  server_id: number;
  user: string;
  host: string;
  port: number;
  source_location: string;
  destination_location: string;
  type: "sftp" | "ftp";
  wipe: boolean;
  wipe_all_files: boolean;
  status: "pending" | "importing" | "completed" | "failed";
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportsResponse {
  success: boolean;
  data: {
    imports: ImportItem[];
  };
  message?: string;
}

export interface AllocationItem {
  id: number;
  node_id: number;
  ip: string;
  port: number;
  ip_alias?: string;
  notes?: string;
  is_primary: boolean;
}

export interface AllocationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  from: number;
  to: number;
}

export interface AllocationsResponse {
  success: boolean;
  data: {
    server: {
      id: number;
      name: string;
      uuid: string;
      allocation_limit: number;
      current_allocations: number;
      can_add_more: boolean;
      primary_allocation_id?: number;
    };
    allocations: AllocationItem[];
  };
  message?: string;
}

export interface AvailableAllocationsResponse {
  success: boolean;
  data: {
    allocations: Omit<AllocationItem, "is_primary">[];
    pagination: AllocationPagination;
    search?: {
      query: string;
      has_results: boolean;
    };
  };
  message?: string;
}

export interface FirewallRule {
  id: number;
  created_at: string;
  updated_at: string;
  server_uuid: string;
  remote_ip: string;
  server_port: number;
  priority: number;
  type: "allow" | "block";
  protocol: "tcp" | "udp";
}

export interface CreateFirewallRuleRequest {
  remote_ip: string;
  server_port: number;
  priority?: number;
  type: "allow" | "block";
  protocol?: "tcp" | "udp";
}

export interface FirewallRulesResponse {
  success: boolean;
  data: {
    data: FirewallRule[];
  };
  message?: string;
}

export interface Proxy {
  id: number;
  server_id: number;
  domain: string;
  ip: string;
  port: number;
  ssl: boolean;
  use_lets_encrypt: boolean;
  client_email?: string | null;
  ssl_cert?: string | null;
  ssl_key?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProxyCreateRequest {
  domain: string;
  port: string;
  ssl: boolean;
  use_lets_encrypt: boolean;
  client_email?: string;
  ssl_cert?: string;
  ssl_key?: string;
}

export interface ProxiesResponse {
  success: boolean;
  data: {
    proxies: Proxy[];
  };
  message?: string;
}

export interface DnsVerifyResponse {
  success: boolean;
  data: {
    verified: boolean;
    expected_ip?: string;
    message?: string;
  };
  message?: string;
}

export interface SubdomainDomain {
  id: number;
  uuid: string;
  domain: string;
}

export interface SubdomainEntry {
  id: number;
  uuid: string;
  domain: string;
  subdomain: string;
  record_type: string;
  port?: number;
  created_at: string;
  updated_at?: string;
}

export interface SubdomainOverview {
  current_total: number;
  max_allowed: number;
  domains: SubdomainDomain[];
  subdomains: SubdomainEntry[];
}

export interface SubdomainCreateRequest {
  domain_uuid: string;
  subdomain: string;
}

export interface Schedule {
  id: number;
  server_id: number;
  name: string;
  cron_day_of_week: string;
  cron_month: string;
  cron_day_of_month: string;
  cron_hour: string;
  cron_minute: string;
  is_active: number;
  is_processing: number;
  only_when_online: number;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleCreateRequest {
  name: string;
  cron_minute: string;
  cron_hour: string;
  cron_day_of_month: string;
  cron_month: string;
  cron_day_of_week: string;
  only_when_online: number;
  is_active: number;
}

export type ScheduleUpdateRequest = ScheduleCreateRequest;

export interface SchedulePagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
}

export interface Task {
  id: number;
  schedule_id: number;
  sequence_id: number;
  action: string;
  payload: string;
  time_offset: number;
  is_queued: number;
  continue_on_failure: number;
  created_at: string;
  updated_at: string;
}

export interface TaskCreateRequest {
  action: string;
  payload: string;
  time_offset: number;
  continue_on_failure: number;
}

export interface TaskUpdateRequest extends TaskCreateRequest {
  sequence_id?: number;
}
export interface Subuser {
  id: number;
  server_id: number;
  user_id: number;
  username?: string;
  email: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface SubuserPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
}

export interface SubusersResponse {
  success: boolean;
  data: {
    data: Subuser[];
    pagination: SubuserPagination;
  };
  message?: string;
}

export interface SubuserPermissionsResponse {
  success: boolean;
  data: {
    permissions: string[];
    grouped_permissions: Record<
      string,
      {
        permissions: string[];
      }
    >;
  };
  message?: string;
}

export interface RealmsResponse {
  success: boolean;
  data: {
    realms: ServerRealm[];
  };
  message?: string;
}

export interface SpellsResponse {
  success: boolean;
  data: {
    spells: ServerSpell[];
  };
  message?: string;
}

export interface SpellDetailsResponse {
  success: boolean;
  data: {
    spell: ServerSpell;
    variables: Variable[];
  };
  message?: string;
}

export interface FileObject {
  name: string;
  mode: string;
  mode_bits: string;
  size: number;
  isFile: boolean;
  symlink: boolean;
  mimetype: string;
  created_at: string;
  modified_at: string;
  // API Response raw fields
  created?: string;
  modified?: string;
  directory?: boolean;
  file?: boolean;
  mime?: string;
}

export interface FilesResponse {
  contents: FileObject[];
}

export interface FileUploadStatus {
  id: string;
  name: string;
  size: number;
  status: "pending" | "processing" | "uploading" | "completed" | "error";
  progress: number;
  error?: string;
}
