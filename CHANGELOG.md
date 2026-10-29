# Changelog

## v1.5.3 STABLE

### Added

- Multi-provider panel outbound mail: provider presets (Resend, Brevo, SendGrid, Mailgun, Postmark, MailerSend, SparkPost, Amazon SES, Gmail, Outlook, Mailtrap, SMTP2GO, custom SMTP) plus HTTP API transports in the async-runner (`mail_transport`, `mail_api_key`, `mail_api_domain`, `mail_api_region`). Delivery uses official/mature SDKs where available (`resend-rs`, `sendgrid`, `postmark`, `aws-sdk-sesv2`) and thin HTTP for the rest; SMTP stays on lettre. Admin Email settings and the setup wizard show or hide SMTP vs API fields from the selected preset. by @nayskutzu
- VDS Boot page (`/vds/{id}/boot`, sidebar for QEMU VMs): boot order editor (disks, CD-ROMs, NICs via `GET/PUT /api/user/vm-instances/{id}/boot-order`), host library ISO mount/unmount, and My ISOs (upload, URL fetch, quota, mount) moved off the old Settings ISO block. by @nayskutzu
- Per-node VDS ISO and rescue settings on Admin → VDS nodes → Storage: user ISO storage, allowed ISO storages, and rescue ISO volid. New columns on `featherpanel_vm_nodes` are seeded from the former global `vds_iso_*` / `vds_rescue_iso` settings; `GET /api/admin/vm-nodes/{id}/iso-storage` lists storages and ISO files from Proxmox. by @nayskutzu
- Admin Proxmox host firewall on the VDS node edit Firewall tab: enable/disable, inbound/outbound policy, rule list, add/delete rules, optional PVE node selector, cluster firewall status, and audit-logged APIs under `/api/admin/vm-nodes/{id}/firewall*`. by @nayskutzu
- VNC extra keys on the embedded VDS console: sticky Ctrl/Alt/Shift/Win, navigation and F-keys, and shortcuts (Ctrl+Alt+Del, Ctrl+Alt+Esc/F1-F7, Alt+F4, Alt+Tab, Print Screen) via noVNC `sendKey`. by @nayskutzu
- Granular admin permissions: separate nodes for Wings (`admin.nodes.*`), web hosting (`admin.web_nodes.*`), VDS/Proxmox (`admin.vm_nodes.*`, `admin.vm_instances.*` including create), mail/DNS hosts, hosting packages, AbuseIPDB, and audit log. Role editor, admin sidebar and create-server actions gate on the matching permission. Migrations copy existing grants so upgrades keep access. by @nayskutzu
- Source installer: FeatherTail / Proxmox host agent path (`--feathertail-install-only`, `feathertail|proxmox` aliases), optional full `apt upgrade` with an interactive warning and `FP_SYSTEM_UPGRADE`, and `FeatherTail/` ignored in git. by @nayskutzu
- Bring your own backup storage: users can add their own S3 compatible buckets (Account, Backup storage) and pick one when creating a backup, in full server backups and in backup schedule tasks. Keys are stored encrypted, endpoints must be https and resolve to public addresses (checked when saved and again on every use, with DNS pinned), and each destination can be tested. Admins turn it on with `backup_byo_enabled` and set allowed providers (`backup_byo_providers`) and a per-user limit (`backup_byo_max_per_user`). Backups on user storage still count toward the server backup limit; the backup list shows where each backup lives, and removing a destination marks its backups as orphaned. by @nayskutzu
- Backups on your own storage no longer count toward the server backup limit (by count or size); only backups on the host's storage do. This applies to manual backups, full server backups, schedules, the chatbot, and the "X / Y" counters, and the storage picker now says these backups do not use the host's quota. FIFO rotation only removes backups from the same storage pool as the new backup (host storage, or that one destination), so a host backup never deletes a backup on your storage and the other way round. Admins can make them count again with `backup_byo_count_toward_limit` (default off); a limit of 0 still disables all backups. by @nayskutzu
- Backups on S3 compatible storage now really work: the panel creates the multipart upload, gives Wings short-lived SigV4 presigned part URLs (part size `backup_upload_part_size_mb`, parallel parts `backup_max_concurrent_uploads`), completes or aborts the upload, and serves downloads and restores through presigned GET links that expire (`backup_presign_ttl_minutes`). Admin, Settings, Backup Storage holds the S3 endpoint, bucket and keys (stored encrypted, never sent to nodes) with a Test connection button. Deleting a backup also deletes the object. Restore no longer accepts a download URL from the browser. by @nayskutzu
- Google Drive as backup storage: admins add a Google OAuth client (Admin, Settings, Backup Storage) and allow `gdrive` in `backup_byo_providers`; users connect their Drive under Account, Backup storage (OAuth with PKCE and a signed one-time state, scope `drive.file` only, refresh token stored encrypted). Wings uploads straight to Drive with a resumable session (needs FeatherWings with resumable uploads, older nodes get `NODE_RESUMABLE_UNSUPPORTED`), the file is checked by size and SHA-256, downloads go through short-lived signed links with Range support and restores get a fresh access token. The card shows the account and quota; if access is revoked the destination is marked revoked, the user gets a notification and can reconnect, and removing it revokes the token and marks its backups orphaned. by @nayskutzu
- Dropbox, OneDrive, SFTP and WebDAV as backup storage: Dropbox and OneDrive connect with OAuth (admins add the app key/client under Admin, Settings, Backup Storage and allow `dropbox`/`onedrive`) and Wings uploads straight to them with resumable sessions that recover from failed chunks. SFTP (password or private key, host key pinned on first use) and WebDAV (https, public address) are relayed through the panel, so they are off by default: admins turn on `backup_byo_relay_enabled` after the warning and the panel checks it can run them (phpseclib, free disk for staging). Relay uploads use signed chunked links, are checked by SHA-1 and size, and abandoned uploads are cleaned up after two days. by @nayskutzu
- Resumable chunked file uploads on FeatherWings nodes: files larger than one part (default 50 MB, `server_upload_chunk_size_mb`, 5 to 90 MB) are sent in parts below Cloudflare's 100 MB request limit, retry with backoff, resume after a reload or network drop, and show speed, ETA, pause, resume and cancel. Older nodes fall back to the single request upload. Needs FeatherWings with `/upload/chunk` (FeatherWings #29). by @nayskutzu
- Resumable chunked uploads for the web hosting (webspace) file manager too: parts go to the panel (`/api/user/webspaces/{id}/files/upload/chunk`), are staged under `storage/chunked-uploads` (removed after 24 hours, at most 8 open uploads per user, checked against the webspace disk limit, optional SHA-256) and the finished file is handed to FeatherQuilld. Part size is `server_upload_chunk_size_mb`, lowered to fit PHP `post_max_size`. Same progress, speed, ETA, pause, resume and cancel as server files. by @nayskutzu
- Email and Discord webhook notifications for server events (crash, backup completed or failed, file transfer finished, resource limit). Opt-out per event and per channel under Account, Notifications, with a test button for the webhook. (#352) by @nayskutzu
- Calendar view for scheduled backups on Admin, Backup schedules: planned and finished runs per day, failed days highlighted. (#354) by @nayskutzu
- Maintenance mode (`maintenance_mode_enabled`, `maintenance_mode_message` in Settings, Status Page). Non staff get `503 MAINTENANCE_MODE`, staff keep working with a banner, the status page stays reachable. (#355) by @nayskutzu
- Cmd+K / Ctrl+K command palette with live user search for staff, `g` then a letter to jump between pages and a `?` shortcut help overlay. (#356) by @nayskutzu
- Admin Security center (`/admin/security`): require 2FA per role, password policy, IP allow list for staff or everyone, and new sign-in email alerts. (#357) by @nayskutzu
- Admin System health page (`/admin/health`): database, Redis, Wings nodes, scheduled tasks, queues, disk and versions. (#358) by @nayskutzu
- View as user: new `admin.users.impersonate` permission, read only for one hour, audit logged, with a banner and a Stop button. Staff accounts need `admin.root`. Role editor gets presets (Read-only admin, Support, Moderator, Server manager). (#359) by @nayskutzu
- Per server resource graphs (24 hours and 7 days, with limit lines) and alerts when CPU, memory or disk stays at 90% or more of the limit for 15 minutes (at most every 6 hours). Resource samples are kept for 7 days. (#360) by @nayskutzu
- Crash detection stores the crash time and the last 50 console lines, shown on the console with a dismiss button. Crash auto restart can be turned off per server (console card or Settings, Crash detection). (#361) by @nayskutzu
- Subuser invite links with a permission set, expiry (1 to 720 hours) and use limit (1 to 50), revocable, accepted at `/dashboard/invites/{token}`. Permission presets (Read only, Console operator, File manager, Full access) in the invite and permissions dialogs. (#362) by @nayskutzu
- Global "Reset alt detection for all users" on the admin users page (`POST /api/admin/users/alt-detection/reset`, `admin.users.edit`). (#342) by @nayskutzu
- FeatherOS: native server window with a Finder style sidebar for every server section, including a file manager pane, plus Settings and Activity panes. (#343) by @nayskutzu
- FeatherOS: windows close with a macOS style animation (skipped with reduce motion). (#344) by @nayskutzu
- FeatherWings node options (#363, needs FeatherWings #23): a switch on Admin, Nodes, Advanced that fails a server install when the install script exits non-zero (off by default), container CPU shares (default 1024, 0 uses the Docker default), and an option when resetting the node key to push the new key to the node automatically. The key is only changed if the node accepts it. The server console shows a block I/O card when the node reports disk I/O. Only offered on FeatherWings nodes. (#363) by @nayskutzu
- Single and mass server transfers remember whether the server was running and start it again on the new node once the transfer succeeds (offline servers stay off). On by default, with a "Restore power state after transfer" opt-out in both transfer dialogs. Start attempts are retried for a few minutes, logged in the server activity, and a notification is sent if the server could not be started. Starts right away with FeatherWings #25, older Wings are covered by the retries. by @nayskutzu
- FeatherPanel Premium is now described as what it is: an optional monthly donation that helps keep the panel going, not a paywall. Every panel feature works without it. If you can't donate, you can claim free Premium on Admin, FeatherPanel Premium by starring the GitHub repo or spreading the word. Free Premium lasts 30 days and is renewed the same way; when it expires the extras return to the defaults. (#370) by @nayskutzu
- Donation link to the non-profit Hack Club HCB fund (admin only): a small card on the admin dashboard that hides for 30 days when dismissed (synced per admin) and is never shown while Premium is active, plus a Support FeatherPanel link on the Premium page. (#370) by @nayskutzu
- Plugins: settings in `conf.yml` get their defaults, required flag and validation applied, and the admin plugin page shows required settings and a not configured state. (#365) by @nayskutzu

- Sign in with Google and GitHub next to Discord and generic OIDC: authorization code flow with state and PKCE (also added to OIDC), Google id_token checked against its JWKS with nonce, GitHub verified email lookup. New Settings > OAuth options for allowed email domains, registration through SSO and auto-linking by verified email (off by default, which now also applies to OIDC). Users link and unlink providers under Account > Settings; the last sign-in method cannot be removed from an account without a password. SSO sign-ins now go through the login page so two factor, ban and deletion checks apply. Setup guide in the docs under FeatherPanel, Features, Single sign-on. by @nayskutzu
- Node alerts on Admin, Nodes, Status: a cron checks every Wings node each minute and raises alerts for a node that stops answering (after a set number of checks, maintenance nodes skipped), disk usage above a set percent (default 90%) and failed backups. Alerts go to the panel inbox, email and a signed webhook (`X-FeatherPanel-Signature`, https only, public addresses only with DNS pinned, no redirects), are deduplicated with a cooldown and send a resolved notice. The status page shows last heartbeat and recent failed backups per node, open alerts with Resolve, alert history with filters, settings, a test alert and Run check now. All changes are audit logged. by @nayskutzu
- Inactive server cleanup (Admin → Inactive Servers): finds servers with no owner or subuser activity, warns owners (inbox and email), then after a grace period only notifies, suspends, backs up to S3 and deletes, or deletes. Off by default; destructive actions need an explicit confirmation, manual runs need a dry-run preview, servers can be exempted, staff-suspended servers are skipped, runs are capped per hour and every step is audited. Per-user disk quotas: an admin default plus per-user overrides, enforced on server create and disk increases, shown on the user dashboard.
- Security center: require two-factor authentication for every admin with an optional 0-30 day grace period. Affected users see a reminder banner with the deadline, and the panel refuses a setting that would lock out the admin saving it. Admins can see and sign out a user's active sessions from the new Sessions tab on the user edit page (audited). by @nayskutzu
- Ctrl+K palette upgrades: recent results per user, `>` commands (toggle theme, clear recents, admin shortcuts filtered by permission), `/` file search inside the current server, node and ticket results, `@nodes`/`#tickets`/`#files` scopes, fuzzy word-prefix ranking with groups ordered by best match, Tab/Shift+Tab to jump between groups, Home/End, and Ctrl/Cmd+Enter to open in a new tab. by @nayskutzu

### Improved

- VDS ISO flow: rescue and user ISO storage resolve per VM node (legacy global settings still fall back); admin VDS ISO list aggregates node storages; Mount ISO is host-library only; Settings points to Boot; admin VDS settings ISO group links to VDS nodes; `vds_iso_library_only` defaults to true. by @nayskutzu
- Embedded VDS console VNC reconnects after stop/reboot/start and unexpected disconnects (clears stale tickets, retries with backoff) so noVNC is not stuck on a dead session. by @nayskutzu
- User and admin VDS firewall pages: segmented controls, clearer option rows and a shared card layout. by @nayskutzu
- Email settings UX: provider preset hint card (docs, free-tier badge, API vs SMTP) and server-side validation before saving mail settings (`mail_transport`, API key, Mailgun domain, SES region). by @nayskutzu
- Admin settings search indexes VDS settings by section group; VDS features expose why custom ISOs are blocked (`mode` vs missing node storage). by @nayskutzu
- Sticky navbar preference reads consistently via `useSyncExternalStore`; PanelIcon and the command palette skip unknown Lucide names instead of breaking. by @nayskutzu
- No more glow on hover anywhere: removed colored and lifted hover shadows (inputs, textareas, selects, cards, plugin buttons, spell picker, node modules, setup wizard, account settings links, FeatherOS theme cards, `.fp-lift`), the hover ring on step indicators and the hover brightening halo on admin quick stats. Focus rings are unchanged. by @nayskutzu
- The floating top navbar now has the same width, side margins and edges as the page column under it (server, admin and dashboard pages, all sidebar modes, phone and desktop). by @nayskutzu
- Memory use of the Docker image is bounded. `FRANKENPHP_MAX_THREADS=auto` is now sized from the container memory, pool defaults are lower and workers recycle when their heap grows. New and changed environment variables: `PHP_MEMORY_LIMIT` (512M), `PHP_CLI_MEMORY_LIMIT` (1024M, was unlimited), `FEATHERPANEL_WORKER_MAX_MEMORY` (256M), `FEATHERPANEL_WORKER_MAX_REQUESTS` (500, was 1000), `FEATHERPANEL_WORKERS`, `FEATHERPANEL_WORKER_MAX_THREADS` (3 x CPU, max 32), `FEATHERPANEL_SLOW_WORKERS` (2), `FEATHERPANEL_SLOW_MAX_THREADS` (4, was 16) and `CRON_TIMEOUT` (900s). Under load the backend now stays flat at around 160 to 175 MiB. (#338) by @nayskutzu
- Hotfix to the memory fix: dropped the FrankenPHP file watcher, which added native threads and CPU and memory use; workers already check the restart stamp between requests. (#341) by @nayskutzu
- The built in API reference pins Redoc, falls back to the live `/api/openapi.json` and shows load errors instead of a blank page. (#337) by @nayskutzu
- Backup ignore parsing tests and a Cloudflare IP range check script for maintainers. (#353) by @nayskutzu
- Page search bars (server databases, backups, subusers, allocations, webspace and VDS lists, tickets, status) match the card style, and the file manager sort, hidden files, view and Quick access controls now sit inside the toolbar card instead of a floating row. (#369) by @nayskutzu
- The admin setup wizard was rebuilt: welcome hero with a live branding preview, an animated progress rail, smooth step transitions (honours reduced motion), inline validation for mail and Turnstile, keyboard navigation (Enter, Alt + arrows) and a new "You're all set" screen with next steps (location, node, spells, first server, docs). All settings it saves are unchanged. by @nayskutzu
- The `##icanhasfeatherpanel` debug console got a fresh look and a new Panel & server section (admin root): connectivity for database, Redis, Mercure, nodes, cron and queue, build and commit, PHP and FrankenPHP worker info, feature flags, Premium state, node daemon capabilities, copy diagnostics, clear caches and force onboarding (both with confirmation). New read-only `GET /api/admin/debug/runtime`. by @nayskutzu
- Server list polish for phones and desktop: the My/All servers and All/By folder switches are proper tabs with full width, 44px tap targets and focus rings, the folder view shows an empty state instead of a blank page, the empty card got a cleaner look with a gentle fade (off with reduced motion), pagination buttons have labels, and the dashboard shell keeps content clear of the phone home bar. by @nayskutzu
- Admin home toolbar on phones: Refresh, Customize, Clear and Settings now sit in an even two-column grid with 44px buttons and matching styles instead of a ragged wrap. by @nayskutzu
- Admin lists (users, nodes, servers and every other list on the shared table): clickable rows can be reached with Tab and opened with Enter, the row menu is a 44px target on phones, phone cards fade in gently (off with reduced motion), the loading skeleton now has the same shape as the table or cards it replaces, and Blocked email domains switched from a sideways-scrolling table to the shared table with phone cards. by @nayskutzu
- **Panel - safe areas & keyboard focus**: the viewport now uses `viewport-fit=cover` and the dashboard shell, mobile sidebar drawer and auth screens pad themselves with `env(safe-area-inset-*)`, so nothing sits under a notch or home bar. Every link/button/tab gets a visible focus outline for keyboard users, and the phone navbar title now truncates instead of pushing the notification bell and avatar off screen on server pages.
- Server pages read better in light mode and on phones: amber warnings, IP/port chips and other dark-only panels now have proper light-theme colours, page loads show a skeleton of the page instead of a lone spinner, and header actions sit on one row on phones (the main action grows, refresh/import stay square 44px buttons) instead of a stack of full-width icon buttons. by @nayskutzu
- Sign-in, register and password screens get a slow theme-coloured aurora background with a faint dot grid (Aurora and Glass presets, CSS only, paused with reduced motion) and a soft glow behind the form card.
- Panel polish: loading skeletons now shimmer instead of blinking, server cards lift with a theme-tinted shadow on hover and press down on tap, the live status dot pulses with a soft ring, status badges are readable in dark mode, resource bars ease smoothly and text selection uses the theme colour. Everything respects reduced motion.
- Console and toasts: the terminal header gets a soft gradient, desktop window dots and a pulsing live dot while running, the console card highlights when focused, and toasts are rounder and glassy with a softer shadow.
- Empty states across the panel get a small illustration (theme glow, rings and a gently floating icon) and rise in softly; dialogs open as bottom sheets with a grab handle on phones; the phone navbar gives the server switcher its full width again. Reduced motion is respected.
- Phones get a bottom navigation bar in the user dashboard (Home, Servers, Account, Menu) with 48px targets and safe-area padding, hidden from tablet width up; tabs get a hover tint and a soft raised active state; design scale tokens (radius, shadow, type ramp, easing) are now CSS variables used by menus and tabs.
- File manager and console: files get colour-coded type tiles (code, config, archives, images, jars, scripts, logs), selected rows show a theme accent bar, the drag-and-drop overlay is calmer with an inset dashed frame and a floating upload tile, and the console input glows on focus, shows a keyboard hint and fills the send button once you type.
- Dropdown menus fade and scale in and out from their anchor, pages fade in lightly on navigation (opacity only, off under reduced motion), and the file manager breadcrumb highlights the current folder with the primary tint.
- Admin settings: categories that hold unsaved edits get an amber dot in the sidebar, each changed field gets an amber edge marker until saved, and categories mixing values and switches are split into labelled Values and Switches sections.
- Admin lists share one toolbar component (AdminListToolbar) with search, a clear-search button, a filter slot, a right-aligned actions slot and an optional bulk-selection bar; adopted on locations, nodes, mounts, realms, notifications, web nodes, backup schedules, database hosts, translations and ticket categories, priorities and statuses.
- Admin dashboard stat tiles get a coloured icon, a soft corner glow and numbers that count up (instant under reduced motion); the analytics activity and user trend charts are now gradient area charts with a themed tooltip.
- AdminListToolbar now also covers users, servers (stacked filter row), roles, spells, tickets and blocked IPs, so every main admin list shares the same search bar and clear button.
- Server console on phones docks the power buttons in a fixed bar at the bottom of the screen (safe-area aware); live CPU, memory, disk, network and disk I/O values ease between updates (instant under reduced motion); the file context menu shows Enter, F2 and Del shortcut hints and the file toolbar is tinted while files are selected.
- Tickets empty state uses a standard-size create button, the ticket search reserves room for its icon, and the schedule create icon matches other headers.
- Performance: cards no longer run a backdrop blur when the page background is a plain colour (the blur was invisible there); sticky and fixed bars keep their glass. Desktop scroll on console/files/admin went from ~33-45 to 60 fps in local headless measurements.
- File manager bulk-selection bar (server and webspace): solid count pill with a visible "Selected" label (the old xs: breakpoint never existed), an icon clear-selection button instead of an uppercase Cancel link, and a labelled Delete action with better light-theme contrast.
- File editor header (server and webspace) now shows the file name, a path breadcrumb, a language badge, a saved/unsaved/saving indicator and the Ctrl+S / ⌘S hint on Save; stacks cleanly on phones. Active editor tabs get a ring and larger touch targets.
- Floating hover-reveal top bar no longer leaves an empty band or shows a clipped sliver: it overlays the page when revealed (no content jump) and shows a slim handle while tucked away. The Appearance section nav now sticks just below the top instead of 6rem down.
- Startup page: the selected Docker image now uses the theme primary colour instead of hard-coded blue, and the empty variables state is no longer shouted in caps. Backup-disabled/limit warnings (server and VDS) now have readable text contrast on the light theme.

### Fixed

- Production containers no longer grow to many GB and get OOM killed; cron no longer runs every job twice after a failed run. (#338) by @nayskutzu
- Clearing a user's fingerprint in alt detection now also drops IP based alt links. (#342) by @nayskutzu
- Missing setup wizard module step translations. (#339) by @nayskutzu
- FeatherOS: plugin context menus no longer open over the desktop menu (#340); the server window console opens its own server (#345); the server window file manager no longer shows a double sidebar (#349). by @nayskutzu
- Missing `ALT_RESET_FAILED` error translation. (#350) by @nayskutzu
- The login page no longer shows the Password/Passkey row twice when Discord or OIDC is the primary method. (#351) by @nayskutzu
- Crashes were never detected because Wings reports a crash as running to offline, not as `crashed`; crash notifications and the crash hook now fire. Server log requests now use the `size` parameter Wings expects. (#361) by @nayskutzu
- Auto start on Wings boot now respects the panel setting (FeatherWings #19), and crash auto restart is no longer applied when it is switched off (FeatherWings #20). Requires the Wings update. by @nayskutzu
- FeatherOS follows the panel light/dark preference instead of switching the panel to the light theme; FeatherOS can still override the theme temporarily without locking the panel setting. by @nayskutzu
- Plugins: plugin CLI commands are found from `APP_ADDONS_DIR` instead of the working directory, Cron intervals are stored in seconds so the `S` unit works, mixins register before plugins load, and the generated starter Cron example uses the addon namespace. (#365) by @nayskutzu
- Real working VNC proxy. Now it fully works with any kind of setup by @nayskutzu!
- Embedded VNC no longer stays disconnected after a guest reboot or power cycle when the console is still open. by @nayskutzu
- Invalid or missing Lucide icon names in navigation or global search no longer break PanelIcon. by @nayskutzu

### Security

- Admins without `admin.root` can no longer edit, ban, delete or create SSO tokens for an account that holds `admin.root`, and can no longer create users with a role other than the default one. (#371) by @redstonerthebest
- Granting `admin.root` to a role, by adding or by changing a permission, now requires `admin.root`. (#371) by @redstonerthebest
- Viewing the panel as another user now also refuses accounts holding `admin.root`, on top of the existing staff rule. (#371) by @redstonerthebest
- Server file transfers check that you can access the target server. (#371) by @redstonerthebest
- VDS backup restores check that the backup belongs to that VM, and VDS subusers no longer see the cloud-init password stored in the VM notes. (#371) by @redstonerthebest
- Lifecycle hook URLs and server-mode API client callbacks are checked against private, loopback and link-local addresses (including IPv6) by resolving the host. (#371) by @redstonerthebest
- API clients: public key Bearer auth stays on by default (private keys are preferred) and can now be switched off in Admin, Settings, App (`api_clients_allow_public_key_auth`). (#371) by @nayskutzu

### Notes

- Breaking: lifecycle hooks and server-mode API client callbacks now need public URLs, and server-mode callbacks must use https. Hooks or callbacks that point at internal addresses, or server-mode callbacks over http, are rejected.
- Breaking (custom roles): Wings `admin.nodes.*` no longer covers VDS nodes/instances, web nodes, mail/DNS hosts, hosting packages, AbuseIPDB or audit log; each area has its own permissions. Upgrade migrations copy matching grants from the old nodes (`admin.nodes.*` → `admin.vm_nodes.*` / `admin.vm_instances.*` / `admin.web_nodes.*`; webspaces → mail/DNS/hosting packages; `admin.users.list` → AbuseIPDB/audit log). Creating a VDS from the admin dashboard now needs `admin.vm_instances.create`.
- Breaking (multi-node VDS): ISO and rescue configuration moves from global Admin → Settings → VDS to each VDS node. Existing global values are seeded onto node rows once; multi-node setups need per-node edits afterwards.

## v1.5.2 STABLE

### Security

- Bumped the Docker base image from `dunglas/frankenphp:1.13.1-php8.5` (PHP 8.5.11) to `dunglas/frankenphp:1.13.2-php8.5` (PHP 8.5.12), which is the FrankenPHP security release that actually ships the PHP2Shell fixes (CVE-2026-109618 / CVE-2026-109619). Also pinned the OCI image to the same tag. by @nayskutzu

### Added

- First-install setup wizard Modules step now also lets you toggle Ticket system, Knowledge base, and Status page (alongside Game servers, Web hosting, and Virtual servers). by @nayskutzu
- Server and VDS expiry dates set by admins are now visible to users on the console header, settings, server/VM lists, and dashboard rows (with a warning style when expiry is within 7 days).

### Improved

- Moved CI/CD workflows back from Blacksmith to GitHub-hosted runners (`ubuntu-latest` / `ubuntu-24.04-arm`), with standard Buildx + `pull: true` so Docker base-image updates are not stuck behind sticky Blacksmith caches. by @nayskutzu

### Fixed

- Frontend Docker image no longer crash-loops on missing `@swc/helpers/_/_interop_require_default` (Next standalone omitted the CJS `_/` helpers; Caddy returned 502). The post-build helper copy now ships the full `@swc/helpers` package, including both `_/` and `esm/`. by @nayskutzu
- Reverted shared frontend CI artifact packaging (it broke pnpm symlinks in standalone and caused `@next/env` MODULE_NOT_FOUND). Frontend images are built again with the full multi-stage Dockerfile per architecture. by @nayskutzu
- API Bearer auth again accepts the public API key by default (as before v1.5.0), so SSO/billing calls such as `POST /api/admin/users/{uuid}/sso-token` no longer return `INVALID_API_KEY` when a valid public key is used. Private keys are still preferred; set `api_clients_allow_public_key_auth=false` to require private keys only. by @nayskutzu

## v1.5.1 STABLE

### Security

- Patched critical PHP RCE vulnerabilities CVE-2026-109618 and CVE-2026-109619 ("php2shell") by pinning the Docker base image to `dunglas/frankenphp:1.13.1-php8.5` and disabling `session.upload_progress` in the container PHP config as defense-in-depth against the upload-progress use-after-free path. by @nayskutzu

### Improved

- Stripped AI-looking glow decoration across the UI: purple blur orbs, primary wash gradients on heroes and cards, status/selection bloom shadows, and decorative empty-state glows. Surfaces now use flat borders and solid backgrounds. by @nayskutzu
- Removed the dashboard "What's new" announcement card next to the greeting (it duplicated the notification bell). Greeting is full-width. by @nayskutzu
- Retired the dot-grid (`pattern`) background option. Existing pattern prefs migrate to solid; light mode falls back to solid instead of dots. by @nayskutzu

### Fixed

- Banned IPs list no longer nests inside itself on desktop (which pushed the table into the wrong columns when there were multiple bans), and long IPv6 addresses wrap inside the name column instead of overflowing. by @nayskutzu
- First-install setup wizard: **Add a node** / **View nodes** no longer bounce back to `/setup` (SetupGate required defer before leaving for admin). Skipping the infrastructure step now completes setup the same way **Finish** does, so done-step links work. by @nayskutzu
- FeatherOS desktop widgets: **Edit Widgets** stays on until **Done**; leaving the widgets panel with the mouse no longer exits edit mode. by @nayskutzu

## v1.5.0 STABLE

### Added

- Added FeatherOS, a browser desktop workspace for managing servers, files, notes, transfers, backups, databases, logs, schedules, terminals, settings, and other panel tools from one place. by @nayskutzu
- Added a redesigned user dashboard with a greeting hero, server overview, customizable widgets, arrange mode, saved layout preferences, 24-hour resource history, sparklines, trends, and an improved responsive layout. by @nayskutzu
- Added admin KPI analytics with date ranges, growth, capacity, top consumers, and infrastructure/server/user views. by @nayskutzu
- Added an admin audit log with searchable activity history and detailed records for administrative actions. by @nayskutzu
- Added a first-install setup wizard and a setup checklist for new nodes. by @nayskutzu
- Added a notifications centre in the top bar with an in-panel notification inbox and unread state. by @nayskutzu
- Added per-device account sessions, including the ability to sign out one device or all other devices. by @nayskutzu
- Added a guided onboarding tour for new users. by @nayskutzu
- Added configurable Game, Web Hosting, and VDS modules with module badges and admin controls. by @nayskutzu
- Added bulk server actions for start, stop, restart, kill, and reinstall. by @nayskutzu
- Added a shared server-list data table with sorting, filtering, pagination, and consistent layouts across server lists.
- Added a new file manager with redesigned browsing, breadcrumbs, thumbnails, file information, quick access, bulk actions, trash improvements, file templates, and transfer progress. by @nayskutzu
- Added cross-server file copy and move with transfer tracking and notifications. by @nayskutzu
- Added shared admin table layouts and redesigns across users, servers, nodes, roles, API keys, tickets, plugins, mail, knowledgebase, databases, updates, and remaining admin pages. by @nayskutzu
- Added admin breadcrumbs, section-aware command palette entries, helpful empty states, node setup checklists, and improved server creation defaults and review flow.  by @nayskutzu
- FrankenPHP worker mode is now the default for `/api/*`: the backend boots once per worker and serves requests from memory (about 2x the throughput and half the latency of classic mode in our benchmark). Chatbot streams and downloads run in a separate small pool; phpMyAdmin, webmail and addon PHP files stay classic. Plugin installs/removals and `.env` changes restart the workers automatically. Set `FRANKENPHP_WORKER=false` to go back to classic mode. Also new: `/api/system/health` for container health checks, a bounded web `memory_limit` (`PHP_MEMORY_LIMIT`, default 512M) and FrankenPHP thread limits (`FRANKENPHP_MAX_THREADS`, `FRANKENPHP_MAX_WAIT_TIME`). by @nayskutzu
- Live updates: FrankenPHP's built-in Mercure hub pushes server, backup, notification and WebSpace changes to the browser over one event stream per tab (`/api/mercure`), so these pages refresh right away instead of polling every 5-10 seconds. Subscribers get a short-lived token from `POST /api/user/realtime/token` that only covers topics they can access. Keys are generated on first start; set `FEATHERPANEL_MERCURE=off` to turn it off. Without a hub (php-fpm, `php -S`) the pages keep polling as before. by @nayskutzu
- Faster API: the compiled route table is cached on disk and the routes are only built when it is stale (about 3.2 ms to 0.6 ms per boot), the admin user and server lists no longer run a query per row (211 to 6 and 410 to 10 queries for 50 rows, about 4x and 5x the throughput), new indexes for the activity, server activity and backup lists, one shared database connection per request, `zend.assertions` off and faster response compression (zstd, brotli level 4). by @nayskutzu
- Source installer and updater: the backend now runs on FrankenPHP (worker mode, Mercure, OPcache) as the `featherpanel-backend` service on `127.0.0.1:8721` behind nginx, installed from the official FrankenPHP packages with all extensions FeatherPanel uses. Updates move existing nginx + php-fpm installs over automatically and roll back if FrankenPHP does not start (`FEATHERPANEL_BACKEND=fpm` keeps php-fpm). Settings live in `/etc/featherpanel/backend.env`. by @nayskutzu
- Privacy mode: one switch in the top bar, the user menu and Preferences hides IP addresses, ports, hostnames, emails, API keys, SFTP details, database credentials, node addresses and Wings tokens across the user and admin areas. Hidden values show `••••••••` and can be revealed with a click; sensitive inputs are masked until focused. It is stored per account and replaces the hide-IP switch from #258, so accounts that already hid IPs keep it on and the admin default still applies. by @nayskutzu
- Unsaved changes bar (Discard / Save with a leave-page warning) on every full-page form with a save button: admin users, nodes, spells, roles, webplates, VDS and web nodes, knowledgebase articles, plugin settings and plugin editor, backup schedules and Wings backup policies/destinations, rate limits, AI agent settings, and their create pages; server and webspace schedules and tasks, server database creation, webspace settings and VDS hardware settings. Forms in side panels and dialogs (locations, realms, mail templates, notifications, translations, database hosts, subuser permissions) keep their own Save button and now ask before closing with edits. The server creation wizard warns before leaving. by @nayskutzu
- New `user.api_keys.create` role permission: lets a role create personal API keys (including MCP keys) when "Allow users to create API keys" is turned off panel-wide. by @nayskutzu
- Compact server console: slim page header with address chip, server hero with status, address, uptime and node chips, a full-height console with a single-row toolbar (filters, quick rules, search, auto-scroll, clear, fullscreen) and CPU, memory, disk and network cards with sparklines. by @nayskutzu
- ClickHouse can now be used as a remote database host, including WebSpace database provisioning, dumps and restores (#255). by @Devority
- Proxmox VNC consoles can now be proxied through the panel, so the Proxmox node is never exposed to the browser (#256). by @Devority
- ARK: Survival Ascended servers now show their player count, read over RCON (#259). by @Devority
- Per-user switch to hide server IP addresses in the panel, handy for screen shares and streams (#258). by @redstonerthebest
- Allocation notes: server users with the allocation update permission can add, edit and remove a short note on each of their server's allocations (up to 255 characters). The note is cleared automatically when the allocation leaves the server, and the admin's own allocation note is left untouched. by @nayskutzu

### Fixed

- Active sessions no longer surface a generic internal-server-error toast when an older installation has not applied the user-session migration yet; the account page keeps working and provides an inline retry state. by @nayskutzu
- Re-running the source installer no longer replaces `DATABASE_ENCRYPTION_KEY` (which made encrypted data unreadable) or the database password, the default `change-me` database password is replaced by a random one, and the no-SSL nginx config no longer points at a backend that was never set up. by @nayskutzu
- Hardcoded English in the frontend moved into translations: about 400 strings (page text, placeholders, titles, labels, select options, empty states, the VDS node setup tutorials, the cron editor) are now translatable keys, and 157 dead English fallbacks after existing translation keys were removed. `scan:hardcoded-ui` now covers the whole frontend (JSX text and user-facing attributes as well as toasts, confirms and page titles) and runs in CI; use an `i18n-ignore` comment for intentional English such as code samples. by @nayskutzu
- Top bar no longer crowds or overlaps at tablet and laptop widths: the search box now shrinks between the page title and the actions instead of being centered on top of them, the keyboard shortcut hint only shows when there is room, and on phones the admin area, privacy mode and appearance buttons move into the user menu. by @nayskutzu
- API key creation no longer depends on the admin `admin.api.bypass_restrictions` permission. Creation follows the "Allow users to create API keys" setting (or the new `user.api_keys.create` permission), and `admin.api.bypass_restrictions` now does what it says: authenticated users with it skip per-route rate limits, everyone else keeps them. The account page also read the `'true'`/`'false'` setting strings as truthy, so the create button and the profile field toggles ignored a disabled setting. by @nayskutzu
- Bottom dock: the dock is now centered at every icon size and only as wide as its items; icons sit in fixed-width slots and hover magnification scales the icon in place, so neighbours no longer shift; long labels truncate cleanly with a tooltip (icons-only mode shows tooltips on hover); section pills are replaced by slim dividers and the collapse toggle is a compact icon button. by @nayskutzu
- Translation placeholders render their values again (`{{name}}` and `{name}`, zero and empty values), e.g. the file manager upload progress showing `UPLOADING {FILE}`. A new `scan:translation-params` step fails the build when a call misses a placeholder value. by @nayskutzu
- Tab bars that overflow (admin settings, user, node, server, spell and webplate editors) keep every tab reachable with scroll fades, arrow buttons and the active tab kept in view; admin settings uses a dropdown on phones. by @nayskutzu
- The mobile top bar no longer disappears when opening folders in the file manager, and the file manager toolbar fits on one row on phones. by @nayskutzu
- Dashboard no longer fires duplicate requests on load (which hit the rate limit and logged `429` errors): the background wrapper stopped remounting the whole page after hydration, identical in-flight GETs are shared, and `429` responses are retried after the `Retry-After` delay the API now sends. by @nayskutzu
- Aurora background handles WebGL context loss/restore, pauses in hidden tabs, respects reduced motion and frees its context on unmount. by @nayskutzu
- Service worker ignores non-GET, cross-origin, API and non-http(s) requests instead of failing them, and is no longer registered in development. by @nayskutzu
- Background and banner images only accept http(s), relative, `data:image` and `blob:` URLs, so pasted `file:///` paths no longer trigger browser security errors. by @nayskutzu
- Web node setup no longer suggests invalid `bash -s -- featherquilld`. Panel install command now uses `FP_COMPONENT=featherquilld` like Wings. Installer accepts `--quilld-install-only` and positional `featherquilld`. Args are validated before any apt work. Early unconditional `apt upgrade`/`purge`/`autoremove` was removed. Cleanup is opt-in via `--system-cleanup`. by @nayskutzu
- WebSpace `/sync` and `/reinstall` create on the daemon when it returns 404. Failed first pushes (e.g. `daemon_sync_failed`) can be retried without DELETE + recreate. by @nayskutzu
- Task updates no longer accept `sequence_id`. Reordering stays on the sequence endpoint. by @nayskutzu
- Addon packages fail closed when ZipArchive cannot validate entries. by @nayskutzu
- File-backed rate counters periodically purge expired keys. by @nayskutzu
- Password reset tokens no longer mark verified accounts as unverified. Legacy tokens keep a compatibility state. by @nayskutzu
- Rate limiting is on by default when `_enabled` is absent. Auto-written `_enabled: false` is migrated once. by @nayskutzu
- Safe URL fetches pin the validated IP per hop. IPv4-mapped private addresses are rejected. by @nayskutzu
- `X-Forwarded-For` is scanned right-to-left. Trusted proxies and Cloudflare are skipped. by @nayskutzu
- WebSpace share create/delete require `file.update`. Read-only subusers cannot manage shares. by @nayskutzu
- API client validate returns only `valid`. It uses a stricter unauthenticated rate limit. OAuth2 expiry applies only to pending requests. by @nayskutzu
- WebSpace listing no longer returns HTTP 500 on a legacy domain conflict, and MongoDB password resets no longer crash (#257). by @Devority
- The account page now shows the **Disable 2FA** button again; it checked `'1'` instead of `'true'` (#260). by @MyMonsterVR
- The 2FA setup QR code now has a white margin in dark mode so it can be scanned (#261). by @MyMonsterVR
- Server disk limits and usage are shown correctly: the server page no longer serves a cached copy of the limits after an admin change, and stopped servers show their real disk usage instead of 0. by @nayskutzu
- Admins can save servers that have no allocation limit set; the edit form sent it back as empty and every save was rejected. Errors of this kind now show the real reason instead of "Name must be a string". by @nayskutzu
- Size fields no longer keep the old value when you type a number and then pick the unit (typing 12 and choosing GB used to save 5 GB). by @nayskutzu
- On phones the sidebar opens from the side you picked in Appearance; the right-hand position used to be ignored. by @nayskutzu
- Startup, server settings, account profile, admin server edit, admin settings and Wings config show a sticky "unsaved changes" bar with Save and Discard, and ask before you leave with unsaved edits. by @nayskutzu
- Fixed runtime and console errors across the panel, including invalid list query strings, wrong permission checks, email-login code abuse, Cloudflare IP range matching, ticket attachment names, and WebSpace read-only access. by @nayskutzu
- Fixed admin and server page layout issues where cards, headers, toasts, borders, or controls could overlap, leave gaps, or render inconsistently. by @nayskutzu
- Fixed dashboard card packing so widgets fill available space regardless of their order. by @nayskutzu
- Fixed account, appearance, and server pages to use the shared card and page-header surfaces consistently. by @nayskutzu
- Bumped the PWA service-worker cache version so updated frontend assets are picked up after the UI redesign. by @nayskutzu

### Improved 

- FeatherOS Terminal now fits saved windows inside the available viewport, starts at a more useful compact size, and uses a single flat macOS-style surface instead of a card nested inside another bordered window. by @nayskutzu
- The Code Editor can now open a persisted workspace folder from the taskbar welcome screen: choose a server and directory, browse its files in Explorer, and open them into tabs without starting from “No file open.” by @nayskutzu
- Dock magnification was toned down to a more natural 1.32× maximum. The Code Editor now opens with a VS Code-inspired welcome workspace, activity bar, Explorer panel, file-opening flow, and multi-file workspace guidance. by @nayskutzu
- Dock magnification now scales only an icon overlay inside a fixed hit slot, so the navbar footprint stays unchanged. FeatherOS app icons were simplified from glossy gradients to a consistent flat color-and-glyph system. by @nayskutzu
- Refined dock magnification so the dock keeps its normal footprint while the hovered icon scales above the bar and stays in front of neighboring icons. by @nayskutzu
- FeatherOS Code Editor now includes a workspace explorer, multi-file tabs, dirty-file indicators, Save All, refreshable folder contents, and a fuller Monaco workspace experience. FeatherOS Terminal now uses a macOS-style chrome with traffic-light controls and a darker terminal surface. by @nayskutzu
- FeatherOS dock magnification now scales icons inside fixed slots so hovering no longer resizes or shifts the whole dock. Finder now has visible multi-selection with Ctrl/Cmd-click, Shift-range selection, Select All/None, and bulk copy, cut, and delete actions. by @nayskutzu
- Expanded auth customization with four visual presets (Aurora, Glass, Minimal, Contrast) that can be combined with the selectable login templates. by @nayskutzu
- Added admin-selectable login templates: split, centered, and spotlight layouts, with safe fallback to the split template for existing installations. Removed generic server start/stop copy from the login marketing panel. by @nayskutzu
- Security Settings now use a clearer status overview for 2FA, active devices, and passkeys, with better grouping and responsive card hierarchy. Login copy was also rewritten to be concise and product-specific instead of generic marketing text. by @nayskutzu
- Refreshed the dashboard, server pages, authentication pages, account pages, admin pages, marketplace, plugin store, database management, and settings with consistent glass surfaces, borders, spacing, page headers, cards, and dark/light mode treatment. by @nayskutzu
- Added shared server headers, compact activity lists, server-side activity filters, full-width stat rows, and equal-height console stat cards. by @nayskutzu
- Improved mobile layouts, responsive tables, navigation, notifications, toasts, focus rings, tab handling, and light-mode contrast across the panel. by @nayskutzu
- Server announcements are rendered on the server to avoid post-hydration layout shifts. by @nayskutzu
- Session, settings, notification, and preference contexts now avoid unnecessary rerenders; date-fns locales are loaded on demand to reduce route bundles. by @nayskutzu
- Error-code messages and active-session errors are translated, and the frontend translation scanners now cover additional user-facing strings. by @nayskutzu
- The installer prompt handling was improved, and the Pterodactyl importer can be hidden when dismissed or no longer usable. by @nayskutzu

## v1.4.1 STABLE

### Fixed

- Saving server startup settings no longer returns HTTP 500 (`Call to undefined method validateVariableValue()`); variable checks use `VariableValidator::validatePayload` only. by @nayskutzu

## v1.4.0 STABLE

### Added

- Forms, sheets, dialogs, and page save actions across the panel support **Ctrl+S** / **⌘S** (mark with `data-fp-save-shortcut` or use `useSaveShortcut`). by @nayskutzu
- Admin **backup schedules** for game servers: target specific servers, all servers on a node, or the whole panel; cron timing with timezone; run history; manual run; failure notifications. Reuses per-server backup limits/FIFO and each node’s default Wings backup adapter. by @nayskutzu
- SMTP settings now include a dedicated **STARTTLS** encryption option (plus **None**), so providers like Brevo on port 587 can be configured correctly; the async mail runner maps `starttls`/`tls` to STARTTLS and `ssl` to SMTPS. by @nayskutzu
- FeatherPanel **MCP OAuth 2.1** (DCR + PKCE + refresh) so Claude.ai custom connectors can **Connect** with panel sign-in / API-key consent; static Bearer / `x-api-key` headers still work. by @nayskutzu
- Added so that the server status column from the database is a source of truth for the server status. by @nayskutzu
- Widgets are now a part of the customization system. by @nayskutzu
- Added full support for progressive web apps (PWA). by @nayskutzu
- QR Code login was added to the panel for easy access to the panel. by @nayskutzu
- Plugins can now add WebSpace sidebar pages, widgets, and listen to WebSpace events (`featherpanel:webspace:*`), matching server and VDS plugin integration. by @nayskutzu
- WebSpaces now appear in the dashboard Resources list (with a WebSpaces filter) and use the left sidebar for navigation like servers and VDS. by @nayskutzu
- The user WebSpaces list now matches the servers/VMs list UI (search, sort, grid/list). Self-service “Order WebSpace” was removed; admins provision WebSpaces. by @nayskutzu
- Server **lifecycle hooks**: Discord webhook steps resolve container environment placeholders (e.g. `{{env.SERVER_PORT}}`, `{{env.YOUR_VAR}}`) in content, username, and embeds when the webhook is sent. by @nayskutzu
- Server **lifecycle hooks**: new `post_stop` hook (runs after the server has stopped; webhook / HTTP / sleep steps only) and Container Shell steps now capture and log truncated stdout/stderr. by @nayskutzu
- Server **lifecycle hooks** can now run a **Backup** step (server files, database dumps or full backup) just like schedule backup tasks, sharing the same limit/FIFO handling. Available on every hook type. by @nayskutzu
- Schedules can now run a **Container Shell** task: a Linux command executed inside the server's Docker container (`docker exec … sh -c`) with a 1-120s timeout, captured stdout/stderr in the activity log, behind the existing admin Container Shell switch and the `control.console` permission. by @nayskutzu
- Webmail links now use short-lived signed SSO tokens with encrypted mailbox credentials for both web-node Roundcube and the panel's Roundcube instance; plaintext credentials are no longer placed in URLs. by @nayskutzu
- Servers can be chosen to be hidden from the public status page. by @nayskutzu
- WebHosting was now added to the panel. by @nayskutzu
- Database backups was added to the panel. by @nayskutzu
- Backups now support the ability to dump the database to a folder. by @nayskutzu
- New type of serve backup added `FeatherBackup` witch is a backup that dumps all the files and the database of the server including metadata and more. by @nayskutzu
- More types of animated backgrounds were added. by @nayskutzu
- More types of fonts were added. by @nayskutzu
- A custom search system was added that can query and find results for everything in the panel! by @nayskutzu
- A handy debug menu for developers to debug the panel was added. It can be accessed by opening the search bar and typing `##icanhasfeatherpanel`. by @nayskutzu
- Brand new sidebar design that really is floating alongside a new Dockbar design. That can be customized with a lot of different styles. with LTR and RTL support. by @nayskutzu
- Support for custom color schemes was added. So now users can chose their own colors for the panel. by @nayskutzu
- Support for more icons engines were added. So now you can chose from lucide, tabler, react-icons, and more. by @nayskutzu
- New way to hide plugins widgets, pages and so much more by @nayskutzu
- Introduced the ability to block specific IP addresses from accessing panel services. by @nayskutzu
- Added Wings backups to the panel. by @nayskutzu

### Improved

- Premium sidebar customization now honors saved ordering across navigation groups, including plugin entries.
- VDS console status polling no longer overlaps or remains blocked on a stalled request.
- Administrators can hard-delete VDS records without contacting Proxmox.
- Premium sidebar customization now applies consistently to VDS and WebSpace navigation, including plugin entries, ordering, visibility, and custom links.
- Admin WebPlates list/create/edit now match Spells/Realms UI (filter chrome, ResourceCards, ghost actions, dual pagination, help cards). by @nayskutzu
- Removed mistaken `user.webspaces.*` role permission nodes; panel roles stay `admin.*` only, and user WebSpace access uses subuser permissions (`settings.update`, etc.). by @nayskutzu
- Admin WebSpaces list/create now match Servers/VDS (filter chrome, ghost actions, owner picker, owner on cards). by @nayskutzu
- WebSpace file manager UI now matches the game server file manager. by @nayskutzu
- WebSpace resource pages (`/webspace/...`) now match server chrome: compact header/info tiles on overview, themed console, settings/SFTP copy fields, glass file toolbars, and no jumbo PageHeader icons. by @nayskutzu
- The colors of the power buttons were improved. by @nayskutzu
- You can now use ENV variables in the server lifecycle hooks. by @nayskutzu
- Security headers for the API requests by @Crackhead-gsk
- If you change the server while editing a file no longer fails. by @nayskutzu
- Session cookies now set HttpOnly, Secure (when HTTPS), and SameSite=Lax via SessionCookieHelper. by @Crackhead-gsk
- Multiple ui improvements were made. by @nayskutzu
- Admin nav: WebSpaces sit under Servers (with game/VDS), WebPlates under Realms (with Spells); Web Nodes stay under Locations & Nodes. Admin Area from a user WebSpace goes to `/admin/webspaces/{uuid}/edit`. by @nayskutzu
- English translations were improved to not reflect LLM generated text. by @nayskutzu
- Complete rewrite of the customization system. by @nayskutzu
- The crash page was improved with a better design and a better message. by @nayskutzu
- Widget rendering system was improved to more fit the responsive design. by @nayskutzu
- The api key encryption system was improved to use the new encryption system. by @nayskutzu & @Crackhead-gsk
- Rewrote how the plugins settings ui works added releams and moved to a full ui rather than a modal! by @nayskutzu
- The entire telemetry system was reworked to enhance privacy, ensure GDPR compliance, and provide secure error reporting to Mythical. by @nayskutzu
- Enhanced handling of Pterodactyl egg file formats with expanded support for additional egg features. by @nayskutzu
- Redesigned the VDS console to look better on more devices. by @nayskutzu
- The documentation was improved to be more accurate and up to date on how to create plugins, widgets, events, permissions, and more. by @nayskutzu
- Redesigned the create server experience for vds,servers,webspaces by @nayskutzu
- Fixed several issues where exceeding form limits would return a generic error, instead of notifying you that the form length is too large. by @nayskutzu

### Fixed

- Migrate no longer fails when removing obsolete addons whose trees contain pnpm directory symlinks (`rmdir(): Not a directory`). by @nayskutzu
- Obsolete addons (`navlayout`, `whitelabel`, etc.) are skipped at route/plugin load so a half-deleted leftover tree no longer 500s on `/api/user/navlayout/active`. by @nayskutzu
- Security: stop auth account enumeration on forgot-password and login (generic responses + timing-safe unknown-user path); Redis-backed per-account escalating login delay and tighter 2FA lockout; expire password reset tokens after 1 hour. by @Crackhead-gsk
- Security: block admin privilege escalation via UsersController::update() (role/2FA/session fields require ADMIN_ROOT) and stop leaking daemon tokens from node list/detail responses; harden Node::searchNodes() sort allowlist. by @Crackhead-gsk
- WebSpace schedule create/update no longer deadlocks MySQL (transaction used a second PDO connection) or hangs the UI waiting on daemon sync. by @nayskutzu
- Fixed: Missing authorization in ServerUserController::updateServer allowed a low-privilege subuser to perform server reinstalls, wipe files, and change the server egg/spell without the proper subuser permissions. by @nayskutzu
- Fixed: FeatherCloud OAuth2 callback previously ran without middleware and skipped the conditional identity check, allowing a single unauthenticated POST to overwrite Mythic-credential integration keys. by @nayskutzu
- Multiple text validation issues were fixed. by @nayskutzu
- Fixed an issue where the Schedules tab was incorrectly hidden when the `server_allow_schedules` setting was unset; it now defaults to visible as intended. by @nayskutzu
- Fixed: Schedule creation no longer fails with a 500 error when `is_active` is submitted as a boolean; boolean values are handled correctly.
- Fixes related to server transfers with bunch of allocations were fixed by @nayskutzu
- The navbar server state was stuck to the last server state instead of updating when the server state changes. by @nayskutzu
- Backups and similar tasks that remain pending for over 3 hours can now be canceled and marked as failed, preventing stuck or hanging jobs. by @nayskutzu

## v1.3.7.10 STABLE

### Added

- Server console Network and Disk I/O cards show all-time totals (in/out and read/write since container start), with a clearer breakdown under the live rates. by @nayskutzu
- **FeatherPanel Premium:** hide the panel version badge in the sidebar (toggle under Premium customization). by @nayskutzu
- Support for Calagopus Wings as a Wings alternative. by @nayskutzu
- File manager “VS Code” action opens a clearer dialog that explains the Calagopus extension requirement and links to the Visual Studio Marketplace and Open VSX install pages. by @nayskutzu

### Improved

- Added an upload image button for eggs in the admin area by @nayskutzu
- Better design for the server power buttons by @nayskutzu

### Fixed

- A way to change the default language of the panel by @nayskutzu
- A way to lock the default language of the panel by @nayskutzu
- Eggs backgrounds can be used as a full server background by @nayskutzu
- Server console on phones no longer scrolls the page instead of the terminal buffer; touch pans stay in the console, and auto-scroll pauses while reading older output so the scrollbar does not jump. by @nayskutzu
- Rules & filters on mobile no longer shows the title and description twice when the sheet opens. by @nayskutzu
- Opening Rules & filters on tablet/desktop no longer also pops the mobile side sheet (it was ignoring `sm:hidden` because the sheet portals to the document body). by @nayskutzu
- Subuser management endpoints now enforce `user.read` / `user.create` / `user.update` / `user.delete`, reject self-modification, validate permission names against the known set, and block assigning permissions the actor does not hold - closing privilege escalation where any invited subuser could rewrite their own permission list. by @nayskutzu
- Fixed an issue where the server would incorrectly display "Java version 69 required" instead of showing the correct Java version (it was displaying the internal class file version). by @nayskutzu
- Frontend Docker image no longer crash-loops on Next.js 16.3.1 (`Cannot find module @swc/helpers/esm/_interop_require_default.js`), which left Caddy returning 502. by @nayskutzu

## v1.3.7.9 STABLE

### Fixed

- File manager uploads no longer proxy the entire file through PHP. The panel issues a signed Wings upload URL and the browser uploads multipart directly to the node (same pattern as downloads), fixing small-file failures caused by panel/proxy timeouts, body size limits, and the default 30s Wings Guzzle timeout. Upload errors from Wings are now shown in the queue instead of a generic save failure. Multi-file and folder uploads correctly chain after each file (previously the queue lock could stop after the first file). Direct Wings uploads use a bare axios client so panel `X-FP-UI-*` headers are not sent (those headers broke CORS preflight). by @nayskutzu
- Frontend Docker/dev builds no longer fail on Google Fonts 404s or CSS `url()` font resolution. Inter and Nunito are loaded via `next/font/local` from `src/fonts/`. by @nayskutzu
- Missing translations were added. by @nayskutzu
- Editing a file and clicking Cancel/back now returns to the folder you were in instead of the server root. by @nayskutzu
- File manager and backup downloads no longer use `window.open` after an async signed-URL request (popup blockers silently blocked downloads); they use a hidden iframe so Wings `Content-Disposition: attachment` downloads start reliably. by @nayskutzu
- File download signed JWTs now include `user_uuid`, matching Wings revocation checks. Missing that claim made Wings return 404 on `/download/file` so clicks appeared to do nothing. by @nayskutzu
- Deleting a firewall rule no longer shows a false error when the rule was actually removed (delete now returns 200 with a JSON body instead of 204). by @nayskutzu
- Ticket priorities now sort by severity level (Low → Medium → High) instead of alphabetically (High → Low → Medium). Admins can also reorder priorities. (FeatherPanel#125) by @nayskutzu
- Installing phpMyAdmin no longer fails with `Failed to delete directory: .../public/pma` when that path is a Docker volume mount - the installer clears and writes into the mount instead of trying to remove it. by @nayskutzu
- Marketplace/plugin updates no longer wipe addon `Storage/` uploads (e.g. Digital File Store product images and downloadable files). Existing Storage is backed up and restored during plugin reinstall. by @nayskutzu

### Added

- Disk IO for the server page was added. by @nayskutzu

### Improved

- Digital File Store (BillingFilesStore): durable media path under `storage/data/`, public portal nav page, marketplace-style storefront, admin product search, and per-file remove. by @nayskutzu
- Imrpoved the design of the console server page. by @nayskutzu

## v1.3.7.8 STABLE

### Fixed

- Hotfix: frontend Caddy no longer crashes on startup from an invalid `path_regexp` using Perl lookaheads (RE2-incompatible). Panels stuck with `caddy entered FATAL state` after v1.3.7.7 recover after updating. by @nayskutzu

## v1.3.7.7 STABLE

### Added

- **FeatherPanel Premium** entitlement from Mythic by @nayskutzu
- **Share files via temp uploads** from the server file manager. by @nayskutzu
- Admin **Force Reconcile** for Docker/containerd desync (FeatherPanel#199): Actions tab shows live Wings runtime health and can call Wings `POST /api/servers/{uuid}/reconcile`. Panel accepts Wings process state `error`, badges/labels it as Runtime Error, and allows Start from `error` like offline.
- Allocation **notes** are shown in node allocation lists, admin server allocation lists, and allocation pickers so admins can document port usage (e.g. Velocity, Dynmap, Geyser) without overloading IP Alias. by @nayskutzu

### Fixed

- Cancel / Go back no longer uses browser history, so after visiting an external site (or opening a bookmarked panel page) you stay in the panel instead of being sent to Amazon/Google/etc. by @nayskutzu
- phpMyAdmin installs are no longer wiped when an administrator presses Update: PMA now lives on a Docker volume (and OCI `/data/pma`), source updates exclude `public/pma` from `git clean`, and a config marker auto-restores the install if files are missing. by @nayskutzu
- File manager search now filters the full directory on the server before the 250-item display limit, so matches outside the first loaded page (e.g. `fy_*` maps after many `de_*` files) are found. by @nayskutzu
- Requests with incomplete or invalid percent-encoding in the path (e.g. `/%f`, `/%ff`, `/server/%A0`) no longer 500 / abort the Next.js response (Cloudflare 520 / Caddy broken pipe); they return 400 instead. by @nayskutzu
- Admin page headers no longer crush titles into vertical letter stacks when many action buttons are present (e.g. Plugins). by @nayskutzu
- Optimized how the admin area is pulling node data! by @nayskutzu

### Improved

- The ai chatbot now supports the ability to read player count and online players. by @nayskutzu
- Allocation notes create/edit help text clarifies that notes are informational labels for what a port is used for. by @nayskutzu

## v1.3.7.6 STABLE

### Fixed

- Codemirror crash on the code editor page was fixed. by @nayskutzu
- File manager downloads now use signed Wings URLs (same as backups) instead of proxying the whole file through PHP, fixing large-file failures caused by the default 30s Guzzle/cURL timeout. by @nayskutzu
- PBS backups no longer show **0 MiB** when snapshot-list size is missing: Wings parses logical size from `proxmox-backup-client` output. New PBS archives default to `root.pxar` (PVE-style `root.pxar.didx` in PBS UI); restore still accepts legacy `server.pxar`. by @nayskutzu
- FastDL generated `sv_downloadurl` no longer uses the Wings API port (e.g. `:8080`); it uses the node FQDN and FastDL bind port (default 80, omit `:80`). FastDL enable/directory is persisted on the server and synced to Wings so it survives restart/power cycles. by @nayskutzu
- Issues with stuck console connections were fixed. by @nayskutzu
- Issues with console on mobile devices were fixed. by @nayskutzu

## v1.3.7.5 STABLE

### Added

- Optional **Wings Remote URL** (`wings_remote_url`) under Admin → Settings → App so FeatherWings can call the panel via a DNS-only hostname when Cloudflare Prenayskutzu / Under Attack Mode blocks daemon traffic to App URL (fixes SFTP “wrong password” when Maximize Security is on). Re-fetch node config after changing. by @nayskutzu
- Mythic Cloud (Panels API) integration updates: OAuth link via `https://my.mythicalsystems.org/oauth2`, Panel API client defaulting to `https://panels.mythicalsystems.org` (configurable / `panels-dev`), handshake + finish routes, marketplace/eggs/pastes/issues client surfaces, and admin issue reporter. by @nayskutzu
- User self-service **account deletion** with admin-configurable verification (2FA and/or email OTP) and deletion modes (instant, delayed with cancellable grace period, or after active services expire). by @nayskutzu
- **Proxmox Backup Server (PBS)** destination for Docker server backups: when Wings has `system.backups.pbs` enabled, new backups stream via `proxmox-backup-client` (pxar) instead of local tar.gz - no zip/archive on the Wings backup folder, with PBS chunk deduplication. Restore/delete use PBS snapshots; file download is disabled for PBS backups. by @nayskutzu
- AbuseIPDB integration: configure an API key under Admin → Settings → Security, check registering IPs (block / log / auto-ban), scan existing users for reported IPs, and optionally report a user's IP to AbuseIPDB when banning (with official category dropdown). by @nayskutzu
- Roles can now use custom icon/image badges, uploadable from the role editor and shown on role badges throughout the panel. by @nayskutzu
- Server **lifecycle hooks**: added **Server-crash Hook** pipeline that runs when Wings reports a crashed container (Discord webhooks, HTTP requests, container commands). by @nayskutzu
- Server **lifecycle hooks**: added **Sleep** step type (1-300 seconds) that can be placed between other pipeline steps. by @nayskutzu
- Server **lifecycle hooks**: added **Container Shell** step type that runs `/bin/sh -c` inside the Docker container via Wings docker exec (with configurable timeout and non-zero exit failure). Gated by admin setting `server_lifecycle_hooks_container_shell_enabled` (default off) under Settings → Servers. by @nayskutzu
- Button in the admin are to mass start, restart, kill, stop servers by @nayskutzu
- Roles can now have custom icons by @nayskutzu
- Admins can send **targeted warnings** to users/servers (e.g. stopped for high CPU): in-panel banners on dashboard and server pages, optional email, plus a quick **Send Warning** action on the admin server Actions tab. by @nayskutzu

### Improved

- Notifications can now target everyone, a specific user, or a specific server (with optional email) instead of only global announcements. by @nayskutzu
- Improved the file editor to use the Monaco Editor Engine or CodeMirror Editor for mobile devices. by @nayskutzu
- Tickets will now be automatically closed once user data has been requested. by @nayskutzu
- Security between the panel and the nodes was improved by using JWT scopes for the connections to prevent unauthorized access. by @nayskutzu
- Fixed some issues with ticket times not being accurate! by @nayskutzu
- Fixed some issues with Avatars sometimes not loading by @nayskutzu
- Admin area dashboard was renamed from Dashboard to Admin Home! by @nayskutzu
- You can now see the servers that are running on the node using the status page @nayskutzu
- Migration to the new platform was completed. by @nayskutzu

### Fixed

- Cloudflare Under Attack Mode / challenge HTML no longer clears the panel session or empties permissions (admin appearing as a normal user, owned-server access errors, console JWT failures). by @nayskutzu
- Marketplace/cloud `.fpa` installs failing with `ADDON_EXTRACT_FAILED`: Mythic packages use AES-256 (PKZIP 5.1) while Info-ZIP `unzip` only supports ZipCrypto - extraction now uses PHP `ZipArchive` (with unzip fallback). by @nayskutzu
- Admin area stats were not loading correctly. by @nayskutzu
- Fixed the issue with unlimited backup limit. by @nayskutzu
- Issues related to port allocation were fixed. by @nayskutzu
- Manual and scheduled server backups now honor custom backup names and exclude lists (patterns are sent to Wings in the correct format). by @nayskutzu
- Fixed the issue with the next-run calculation for cron jobs. by @nayskutzu
- Backups ignored the exclude list and backup names. by @nayskutzu

## v1.3.7.4 STABLE

### Added

- Configurable default avatar provider in admin settings (Gravatar by default, with panel logo, UI Avatars, RoboHash, DiceBear, and custom URL template support). by @nayskutzu
- Admin SSO token settings: configure the default token lifetime in App settings, and optionally pass `expires_in` (minutes, 1-1440) when calling `POST /api/admin/users/{uuid}/sso-token`. by @nayskutzu
- Admin list pages (users, servers, VDS nodes, nodes, VM instances, spells, roles, tickets, and others) now remember search, filters, sort, and pagination in localStorage. by @nayskutzu
- Spells now support a configurable default Docker image (star icon on the spell Docker tab) so new servers use the correct runtime on first install when game images are updated. by @nayskutzu
- Server startup Docker image selection is locked to spell-configured images by default; admins can enable custom Docker image input under Settings → Servers (`server_allow_custom_docker_image`, default off). by @nayskutzu
- Admin server edit now configures Docker image on the Startup tab; create validates the selected image on submit so spell defaults (e.g. Java 25) persist correctly. by @nayskutzu
- Admin settings to configure the login page default sign-in method, display order of authentication options, and hidden methods (local, LDAP, passkey, email code, Discord, OIDC). by @nayskutzu
- Admins now get clearer notifications (including email notifications) when there are open support tickets; the ticket section can show all open tickets if the user is an admin. by @nayskutzu
- Users now receive an email notification when their support ticket is replied to, closed, or reopened. by @nayskutzu
- Added Discord to the links section in settings. displaying these links in a visible area, such as a footer, so users can easily access them.
- Added a button so you can retry sending an email to a user. by @nayskutzu
- Added the you accept our terms of service checkbox to the login page. by @nayskutzu
- Added a custom badge system to roles so you can set a custom badge for each role. by @nayskutzu

### Improved

- Login page CAPTCHA is shown after username/password (before Sign in), full-width in a bordered block, instead of between the two fields. by @nayskutzu
- Styles for the auth LDAP button were improved. by @nayskutzu
- Improved the amazing new role editor page that allows you to edit roles and permissions and thats idiot proof (I HOPE). by @nayskutzu
- Timezones were missmatched into the server backups page. by @nayskutzu
- Now you can sort users by newest and oldest and by username. by @nayskutzu
- Now you can click on the owner's name in the server details page to view the user's profile. by @nayskutzu
- Admin user edit page now includes a Potential Alts tab that finds other accounts sharing IP addresses with the viewed user. by @nayskutzu
- Potential alt detection now also compares server activity IPs and hidden browser sync identifiers (localStorage + cookie) collected across the panel. by @nayskutzu
- Registration can block new accounts when a browser/device already has the maximum allowed panel accounts, pointing users to their main account or support. by @nayskutzu
- Smarter component rendering for improved performance and reliability. by @nayskutzu
- Admins can clear device fingerprint records per user or globally from the Users admin area. by @nayskutzu
- Hopefully fixed some issues with the server console. by @nayskutzu
- Improved phpMyAdmin integration for seamless database management within the panel. by @nayskutzu

### Fixed

- Plugin uploads with mismatched conf.yml identifier/name and PHP entry class namespace now fail validation at install time instead of bricking the panel into maintenance mode. by @nayskutzu
- User server startup page now shows admin-assigned Docker images (e.g. Java 25) even when they are not in the spell image list, matching admin server edit behavior. by @nayskutzu
- Admin spell export now downloads the PTDL_v2-compatible export file instead of the raw database record, and legacy raw exports can still be imported. by @nayskutzu
- Admin Updates page plugin bulk updates now call the correct online install API (`/api/admin/plugins/online/install`) instead of a non-existent route. by @nayskutzu
- Issues related to Discord OAuth2 account linking and registration were fixed. by @nayskutzu
- Small issues regarding spells export behavior were fixed. by @nayskutzu
- Node connections now actually respect the behind proxy setting. by @nayskutzu
- Timezones were missmatched into the admin pages.by @nayskutzu
- Search bar in the server navbar was not working. by @nayskutzu
- Plugin behaviors and errors reporting was improved. by @nayskutzu
- Multiple issues with the server transfer dialog were fixed. by @nayskutzu
- Multiple issues with connections to the nodes were fixed. by @nayskutzu

## v1.3.7.3 STABLE

### Added

- Plugin sidebar priority system by to control the order of the sidebar items. by @nayskutzu
- Verify button on the admin user edit page to force verify the user's email by @nayskutzu
- Verification email resend system in case the user didn't receive the email by @nayskutzu
- Custom server variables system so users can set variables for their servers and also encrypt them. by @nayskutzu
- GDPR compliance system for user data export by @nayskutzu
- Per-user timezone preference in account settings, with browser auto-detection on first visit, so all dates and "X ago" labels render in each user's preferred zone. by @nayskutzu
- Per-server-schedule timezone selector. Each cron schedule now stores its own IANA timezone by @nayskutzu
- Server archives can now be opened and even viewed in the file manager. by @nayskutzu
- Trash bin support in the file manager. by @nayskutzu
- Preview support for archive contents in the file manager. by @nayskutzu
- Added detailed ban and suspension reason tracking for both servers and users, providing greater clarity for the staff team. by @nayskutzu
- Added a copyright notice to acknowledge the creators of the panel. by @nayskutzu
- Introduced a sleek and intuitive server switcher for seamless navigation between servers. by @nayskutzu
- Mass move servers from a node to another with automatic allocation assignment, selectable servers or move-all, and a per-request batch limit for large fleets. by @nayskutzu
- Custom sort order for spells within a realm so admins can control display order (e.g. Node.js before Python before Java). by @nayskutzu

### Fixed

- FIFO (First In, First Out) rotation scheme for log file rotation and cleanup. by @nayskutzu
- Resolved an issue where your avatar would reload 100 times when you type in the chat box. by @nayskutzu
- Admins with admin.dashboard.view permission can now view the dashboard. by @nayskutzu
- Fixed an issue where the chatbot would sometimes get stuck in a loop when trying to do stuff. by @nayskutzu
- Added missing translations to the translations file. by @nayskutzu
- The default theme from admin was not applied if you didn't lock it. by @nayskutzu
- Buch of timezone issues were fixed. by @nayskutzu
- Color issues with vds settings page were fixed. by @nayskutzu
- Further enhanced the plugin installer for improved performance and reliability. by @nayskutzu
- Resolved a significant issue that previously prevented searching for allocations within the admin area. by @nayskutzu

### Improved

- Tickets were pretty cramped and didn't look good on big screens. by @nayskutzu
- Chatbot now supports the ability to get the article content by its ID. by @nayskutzu
- Chatbot token usage has been cut in half by @nayskutzu
- Enhanced Minecraft server compatibility and features to fully support the latest release version. by @nayskutzu
- Added a white (light) mode option for Wings server configuration files, enhancing visibility and user experience in brighter environments. by @nayskutzu
- Enhanced the console layout for mobile devices, offering a smoother and more intuitive user experience. by @nayskutzu

## v1.3.7.2 STABLE

### Fixed

- Enhanced the plugin loader strategy to resolve minor issues introduced in the previous update. by @nayskutzu

## v1.3.7.1 STABLE

### Improved

- Introduced a unified themes context for plugins, enabling seamless support for both dark and light modes. by @nayskutzu
- Improved enforcement and consistency of theming options throughout FeatherPanel, resulting in a much more polished appearance. by @nayskutzu
- Enhanced the user interface on light mode devices, ensuring optimal readability and eliminating issues like white text appearing on white backgrounds. by @nayskutzu
- Refined navigation bar for a smoother, more polished experience. by @nayskutzu
- Standardized captcha-related API error codes and messages (e.g. captcha token required / validation failed) across login, registration, password reset, email login, LDAP, and session update flows. by @nayskutzu
- Removed support for reForge Captcha invisible and managed widget modes; the panel only supports checkbox and image, with legacy invisible/managed settings coerced to checkbox in the UI. by @nayskutzu
- Admin-facing copy for reForge Captcha now consistently uses the product name reForge Captcha (labels, descriptions, and provider dropdown text). by @nayskutzu
- Mail templates page now supports the FeatherIDE code editor for editing mail templates. by @nayskutzu
- Admin page rendering now won't get leaked to users (design only) or won't flash them. by @nayskutzu

### Added

- Introduced comprehensive language analytics, allowing you to see which languages your users prefer and how they're distributed. by @nayskutzu
- Added the ability to easily reorder articles by dragging and changing their positions within the list. by @nayskutzu
- Introduced passwordless authentication via secure email code logins, allowing users to sign in using a 6-digit code delivered directly to their inbox. by @nayskutzu
- The category sidebar is now hidden for users who do not have access to any servers or VDS instances, either as an owner or subuser, resulting in a cleaner and more relevant navigation experience. by @nayskutzu
- Added passkey authentication to FeatherPanel for a faster, more seamless login experience. by @nayskutzu
- Introduced a configurable captcha provider (Cloudflare Turnstile, hCaptcha, Google reCAPTCHA including v3, Friendly Captcha, and reForge Captcha) with a shared `CaptchaHelper` on the backend and a unified `Captcha` widget on authentication-sensitive forms. by @nayskutzu
- Extended admin security settings with provider-specific keys, reCAPTCHA version and v3 options, Friendly Captcha fields, and reForge Captcha site key, secret, widget type (checkbox or image), theme, size, language, and minimum verify score. by @nayskutzu
- Captcha provider select options in the admin settings UI now show human-readable labels (including reForge Captcha for the reforge provider value). by @nayskutzu
- FeatherPanel now prompts users without an existing Discord account to easily create one, streamlining the integration process. by @nayskutzu
- Added advanced dependency injection and automatic detection for plugin installations, preventing unexpected issues and ensuring smooth, reliable plugin setup. by @nayskutzu

### Fixed

- Fixed an issue where certain pages displayed unnecessary blank spaces when opened. by @nayskutzu
- Fixed an issue where deleting users with assigned VDS servers would leave those servers unassigned. by @nayskutzu
- Fixed panel logins failing with `INVALID_ACCOUNT_TOKEN` when a user row had a missing or empty `remember_token` by generating and persisting a token during login completion (and the same for two-factor completion). by @nayskutzu
- Fixed session refresh after login by loading `/user/session` through the credentialed API client, enabling global `axios` credentials for cookie-based auth, and blocking native HTML form navigation on the login page so third-party captcha scripts cannot trigger a GET navigation that drops the session cookie. by @nayskutzu
- Fixed TypeScript checking for captcha script loaders by accounting for the non-standard `complete` property on `HTMLScriptElement` in Chromium-based browsers. by @nayskutzu
- Fixed the Lock and Image Fit features aren't working properly in featherpanel by @nayskutzu

## v1.3.7 STABLE

### Added

- Integrated MalwareBazaar as an additional hash database source for Feather Zero Trust, enabling automated import of the latest threat intelligence. by @nayskutzu
- Server **lifecycle hooks**: configurable pre-start and pre-stop pipelines (container commands, Discord webhooks with multi-embed builder and preview, HTTP requests). by @nayskutzu
- Enhanced OAuth2 configuration by displaying the authorization URL, allowing users to easily identify and verify their OCID endpoint. by @nayskutzu
- Introduced UUID-based response for /admin/api/users when creating a new user, aligning with other API endpoints that rely on UUID identifiers. by @nayskutzu
- Added server and VM instance expiry date feature with automatic suspension-set an expiration date on any server or VDS/VPS instance, and it will be automatically suspended when the date is reached. by @nayskutzu
- Enhance power control with state-based actions and kill confirmation by @nayskutzu
- Support for a really early in development player counter by @nayskutzu
- Added an email domain blacklist feature, allowing you to block registrations from unwanted or spammy domains, keeping your platform cleaner. by @nayskutzu
- Added the ability to assign databases to specific nodes-now you can restrict a database (e.g., "hiyra") to be accessible only on selected nodes such as node 1 or node 2, as desired. by @nayskutzu
- Seamlessly create new allocations directly from the server creation tab-no need to leave the page or interrupt your workflow. by @nayskutzu
- Significantly streamlined and enhanced the server creation workflow for a faster, smoother, and more intuitive experience. by @nayskutzu
- Significantly streamlined and enhanced the vds creation workflow for a faster, smoother, and more intuitive experience. by @nayskutzu
- Added a Redis notification system to reload settings across all services when settings are updated. by @nayskutzu
- Addon installations are now preserved during FeatherPanel updates, ensuring your enhancements remain intact after every upgrade. by @nayskutzu
- The chatbot can now and will now work with the VDS pages by @nayskutzu
- Added support to get the file hash of a file in the file manager. by @nayskutzu
- Added BIG query support to the file manager. So you can search for files by name or content. by @nayskutzu
- Added an update tab to the admin area so you can update plugins, the app itself and even the nodes. by @nayskutzu

### Fixed

- Fixed an issue where two loading spinners would appear simultaneously when creating a new VDS instance, ensuring only one spinner is shown as intended. by @nayskutzu
- Resolved an issue where users were redirected to a raw JSON page after logging in via an OIDC provider, ensuring a seamless post-login experience.
- Fixed Proxmox node selection displaying in inconsistent order when creating VDS instances-nodes are now sorted alphabetically for predictable selection.
- Fixed inconsistency where /admin/api/users returned userId instead of UUID, which caused issues when interacting with endpoints such as user retrieval and SSO token creation that require UUID. by @nayskutzu
- Resolved an issue where email subjects were previously hardcoded and could not be customized-subjects are now fully editable. by @nayskutzu
- The copy and the move files operations now work correctly and display progress indicators to the user. by @nayskutzu
- Fixed an issue where in the sidebar you would see the node be active when you were on the status page. by @nayskutzu

### Improved

- Enhanced server power control buttons with proper state-based enabling/disabling (e.g., start only works when stopped, stop/restart only when running). by @nayskutzu
- Added confirmation dialog for the dangerous "Kill" action with a "Don't ask me again" option to prevent accidental server termination that could corrupt files. by @nayskutzu
- Made the kill button less prominent (ghost variant) to further reduce accidental clicks. by @nayskutzu
- Completely reimagined the admin sidebar user experience for enhanced usability and navigation. by @nayskutzu
- Completely removed the FeatherPanel partner showcases from the UI for a cleaner user experience. by @nayskutzu
- You can now seamlessly create a new location while creating a node-no more jumping between steps or prerequisites, making your setup process much easier. by @nayskutzu
- The admin area button now intelligently adapts its destination: on a server page, it directs you to the relevant server or VDS edit page; on the dashboard, it takes you to the main admin area. Additionally, while in the admin section, the admin area button is hidden for a cleaner interface. by @nayskutzu
- Brand new log file rotation and cleanup system that ensures log files are rotated and old logs are cleaned up automatically, freeing up disk space and keeping logs organized. by @nayskutzu
- Resolved various issues with the translations import system, ensuring a smoother and more reliable experience. by @nayskutzu
- Improved the servers mobile responsiveness and layout for a better user experience on smaller screens. by @nayskutzu
- VDS Console & VDS list pages were improved for better usability and responsiveness. by @nayskutzu
- Improved the status page to display node health and resource usage more clearly. by @nayskutzu
- Improved the file manager to display file and directory listings more clearly and efficiently. by @nayskutzu

## v1.3.6 STABLE

### Fixed

- Resolved persistent network connectivity issues affecting OVH and various other installation environments, ensuring stable operation across a wider range of hosting providers. by @nayskutzu

## v1.3.5 STABLE

### Fixed

- Resolved an issue where the Rust async-runner occasionally used IPv6, leading to instability-now reliably defaults to the intended address family for stable operation. by @nayskutzu
- Fixed a bug where the copy button failed to work as expected by @nayskutzu.
- Addressed intermittent issues with drag-and-drop file movement by @nayskutzu.
- Resolved an issue where IP addresses beginning with 172. were incorrectly prioritized as the primary address, ensuring correct IP selection and improved reliability. by @nayskutzu

### Improved

- Supercharged allocation management in server settings for that blana bomba smoothness. by @nayskutzu
- The edit server option now remembers your preferences for a smoother, more personalized experience. by @nayskutzu
- The edit vds option now remembers your preferences for a smoother, more personalized experience. by @nayskutzu
- Significantly enhanced the design and user experience of the User Edit page for a more intuitive and visually polished interface. by @nayskutzu

### Added

- Added support for both soft deleting and permanently deleting servers directly from the server actions page, giving you more control and flexibility. by @nayskutzu

## v1.3.4 STABLE

### Fixed

- Addressed issues causing incorrect "wrong password" errors in SFTP, ensuring authentication works as expected. by @nayskutzu
- Resolved an issue that prevented adding more than 10 permissions to a role, allowing greater flexibility in role management. by @nayskutzu
- Fixed an issue where content statistics failed to display if redirect links were missing. by @nayskutzu
- Fixed an issue causing average installer statistics to fail, ensuring installer analytics are now accurate and reliable. by @nayskutzu
- Resolved an issue where certain language codes such as en-gb, en-ca, and en-us were not appearing in the translations list. While these locales aren't currently used, this update ensures they display correctly for future compatibility. by @nayskutzu
- Improved user experience when creating a VDS: if no IPs are available, a clear warning is now displayed instead of leaving the user with no feedback. by @nayskutzu
- Fixed ticket detail sidebars occasionally showing an invalid "Last Updated" date (1/1/1970) by adding safe date handling and fallbacks. by @nayskutzu
- Fixed knowledgebase category icons not loading on some installations by correcting the upload/storage path resolution for KB-specific attachments. by @nayskutzu
- Resolved an issue where FeatherIDE incorrectly allowed editing of `.jar` files, ensuring binary archives are no longer opened in the text editor. by @nayskutzu
- Fixed an issue where the "Send Test Email" function in Mail Templates ignored the entered recipient address and always sent emails to the main admin instead. Test emails are now correctly delivered to the specified address.

### Improved

- Enhanced translation quality and consistency across all pages for a smoother, more intuitive multilingual experience. by @nayskutzu
- Significantly enhanced the file manager with a smoother, more intuitive experience and quality-of-life improvements throughout. by @nayskutzu
- Enhanced the sidebar and navbar with refined design and smoother interactions for a more seamless navigation experience. by @nayskutzu

### Added

- Added a dynamic notification bubble icon to tickets, instantly highlighting those with new messages since your last reply. by @nayskutzu
- Added an optional security setting to require users to verify their email address before they can log in after registration, including a full verify-email flow and frontend page. by @nayskutzu
- Added a dedicated `verify_email` mail template (editable in Mail Templates) used for email verification, consistent with other system templates. by @nayskutzu
- Introduced a powerful search feature within admin settings, making it effortless to find and manage configuration options. by @nayskutzu
- Added the ability to choose the specific Proxmox node when creating a VDS instance, giving you greater control and flexibility over your deployments. by @nayskutzu
- Added an OAuth2-style API consent flow at `/dashboard/account/oauth2/api/new` with approve/deny screens, callback fragment credential delivery, authorization code exchange endpoint, and dedicated documentation for all supported query parameters. by @nayskutzu

## v1.3.3 STABLE

### Added

- Added a new admin setting to hide IP addresses across server activity logs and account activity views, masking them as `***.***.***.***` for improved privacy. by @nayskutzu
- Crushed those pesky bugs blocking seamless VM ISO mounting for images larger than 1GB-run your massive ISOs with blana bomba smoothness! by @nayskutzu
- Introduced comprehensive mounts support to FeatherPanel, empowering flexible volume management and unlocking new deployment possibilities. by @nayskutzu
- Implemented an advanced rotation scheme featuring FIFO (First-In, First-Out) logic, also known as Rolling Backup Retention, delivering reliable and automated backup management for your servers. by @nayskutzu
- Unleashed API key sign-in: authenticate seamlessly with either API public or private keys-flexibility and security both ways. by @nayskutzu
- Enhanced API key security with robust access controls and advanced IP restriction support, ensuring even greater protection for your integrations. by @nayskutzu
- Introduced the Favorite Servers feature: effortlessly mark your most-used servers for instant access and seamless management from your dashboard. by @nayskutzu
- Introduced the Storage Sense feature: effortlessly analyze and manage old log data with automated cleanup and retention controls for optimal performance and storage efficiency. by @nayskutzu
- Introduced a convenient new button for seamless management of your FeatherPanel local storage-giving you greater control and visibility right from the panel. by @nayskutzu
- Introduced robust file integrity checks, empowering users to effortlessly identify and address anomalies or unexpected changes in their files. by @nayskutzu
- You can now create realms directly from the Install Spell window, streamlining your workflow with no need to leave the install process. by @nayskutzu

### Fixed

- Fixed an issue where the selected frontend locale file was not loaded first for translations, causing incorrect fallback behavior and less reliable localization. by @nayskutzu
- Fixed an issue where the sidebar collapsed state would reset after refreshes, ensuring your preferred layout now persists correctly. by @nayskutzu
- Fixed an issue where the server terminal auto-scroll preference was not remembered between sessions, preserving the chosen behavior more reliably. by @nayskutzu
- Fixed an issue where dark mode could be ignored in File Manager when the operating system theme was set to light mode. by @nayskutzu
- Fixed an issue where IP address blur in activity logs was triggered by row hover instead of direct hover on the IP value. by @nayskutzu
- Resolved an issue where chatbot settings were not always saving correctly. by @nayskutzu
- Updated the panel to return a 503 Service Unavailable response instead of 502 to prevent Cloudflare compatibility issues. by @nayskutzu
- Resolved an issue with plugin icons failing to load due to CORS restrictions introduced in the latest Next.js update. Now loading seamlessly! by @nayskutzu
- Resolved multiple issues affecting SFTP button functionality for improved reliability and compatibility. by @nayskutzu
- Resolved several issues where game locations or VDS locations appeared in inappropriate or unintended areas throughout the panel. by @nayskutzu
- The Subdomains admin page now clearly indicates when subdomain functionality is disabled, providing transparent feedback to prevent confusion. by @nayskutzu

### Improved

- Improved privacy handling so IP masking is now applied consistently across server activity and user activity responses when the setting is enabled. by @nayskutzu
- Enhance server activity page with IP address blurring and dropdown filter integration; update locale strings for better user experience by @nayskutzu
- Enhanced widget rendering framework for plugins, enabling seamless integration of interactive widgets for user actions. by @nayskutzu
- Improved Wings error handling for more accurate responses and clearer error messages. by @nayskutzu
- Resolved an issue where pending emails would never be sent if the async task runner was unavailable or offline, ensuring reliable mail delivery under all conditions. by @nayskutzu
- Redesigned the navigation bar with a refreshed look and significantly improved mobile experience for seamless usability on phones. by @nayskutzu
- Enhanced visibility into daemon errors and related issues, providing clearer diagnostics to streamline debugging and troubleshooting. by @nayskutzu

## v1.3.2 STABLE

### Fixed

- Fixed an issue where translations appeared to exist after an update, but were actually missing. by @nayskutzu
- Corrected the API documentation route to ensure proper access. by @nayskutzu
- Fixed an issue in the admin ticket viewer where image links in ticket messages were incorrectly formatted, resulting in links like `.eu69aecf4298b27_ticket_wait_your_turn.gif` instead of the correct `.eu/attachments/69aecf4298b27_ticket_wait_your_turn.gif`. by @nayskutzu
- Fixed an issue preventing tickets from being closed when using the "Close" popup in the ticket viewer ("Failed to close ticket" error). The trash icon still worked, but this ensures tickets can now be closed from within the viewer as intended. by @nayskutzu
- Mail sending has been significantly improved and is now handled asynchronously for faster and more reliable delivery. by @nayskutzu
- Resolved compatibility issues with outdated eggs that could cause installation failures. by @nayskutzu
- Resolved minor markdown rendering inconsistencies for improved display quality and reliability. by @nayskutzu
- Fixed an issue where locations with assigned nodes could be deleted, potentially causing orphaned node configurations. Locations now properly prevent deletion when they contain active nodes. by @nayskutzu

### Added

- Initial infrastructure implemented for upcoming Proxmox VM support. by @nayskutzu
- Introduced a high-performance async task runner for email delivery, VM provisioning, and more delivering faster execution and improved reliability across the board. by @nayskutzu
- Introduced a dedicated EULA page in the admin area, making it easier for users to review the software license agreement at any time. by @nayskutzu
- Introduced a step-by-step update guide directly within the admin area, making it easier than ever to keep your panel up to date. by @nayskutzu
- Introduced a built-in email server test directly from the mail templates page, making it easy to verify your mail configuration without leaving the panel. by @nayskutzu
- Improved the experience for suspended servers, providing clearer feedback and a more polished interface. by @nayskutzu
- Added support for SFTP subdomains for nodes and databases. by @nayskutzu
- Introduced fully public knowledgebases, allowing anyone to access helpful documentation and resources without needing to log in. by @nayskutzu
- Public status pages, enabling anyone to view real-time system and server status without requiring authentication. by @nayskutzu
- Added streamlined system email sending directly from the user edit page, enabling administrators to communicate with users and provide support without leaving the panel. by @nayskutzu
- Subdomains are now disabled by default, with the option to enable them per-server for improved security and reduced complexity. by @nayskutzu

### Improved

- Enhanced the server list page with a significantly cleaner and more intuitive user experience. by @nayskutzu
- Fonts are now bundled and served locally using Next.js optimized font loading, eliminating external Google CDN requests for improved privacy. by @nayskutzu
- Plugin bootstrapping and logging have been significantly optimized for improved startup performance and cleaner diagnostic output. by @nayskutzu
- Added an installation output handlers to ServerConsolePage by @nayskutzu

## v1.3.1 STABLE

### Fixed

- The file manager upload button now allows you to choose between uploading files or folders, offering greater flexibility and convenience. by @nayskutzu
- Fixed an issue where the server list index did not display in the correct visual order (Z position) by @nayskutzu
- Image embedding and display within markdown is now fully functional. by @nayskutzu
- Resolved issues with Discord account linking and unlinking for a smoother user experience. by @nayskutzu
- Fixed an issue where OIDC user accounts were sometimes not created because the remember token could be null. by @nayskutzu
- Resolved several issues where scheduled cron jobs could fall out of sync during loop iterations, ensuring more reliable and consistent execution. by @nayskutzu
- Resolved an issue where bold text in guides (knowledge base) remained unreadable in light mode, ensuring proper contrast and visibility. by @nayskutzu
- Resolved issues with node synchronization, ensuring accurate and reliable node status reporting. by @nayskutzu

### Added

- Full support for tables in markdown, enabling rich and structured content formatting. by @nayskutzu
- Added dedicated API endpoints for banning and unbanning users, providing clear and documented functionality for user management. by @nayskutzu
- Added the option to trigger schedules to run immediately on the next cron tick for greater control and flexibility. by @nayskutzu
- Seamless export and import functionality for schedules, empowering users to easily back up, transfer, or restore their schedules as needed. by @nayskutzu
- Introduced seamless database export and import functionality with dedicated API endpoints, greatly enhancing user data management and flexibility. by @nayskutzu

## v1.3.0 STABLE

### Improved

- Transitioned FeatherPanel documentation to a fully compiled format, resulting in significantly improved performance and faster access times. by @nayskutzu
- The server name now appears in the navbar when viewing any server page, so users always see which server they are on. by @nayskutzu
- Previous/Next page controls are now shown at the top of every paginated list across. by @nayskutzu
- Resolved an issue where updating environment variables was not functioning correctly. by @nayskutzu
- By default, SEO indexing is now turned off to enhance privacy and control over search engine visibility. by @nayskutzu
- Significantly enhanced the logs uploading process for increased reliability and performance. by @nayskutzu
- One-click mass plugin installation-no more waiting through endless refreshes. by @nayskutzu
- The node name is now prominently displayed on the server console page for improved clarity. by @nayskutzu
- Seamless folder upload is now supported in FeatherPanel, allowing users to upload entire directories with a single action. by @nayskutzu

### Added

- Theme customizer now supports backdrop blur (0-24px), backdrop darken (0-100% overlay), and for custom background images: fit options (Cover, Contain, Fill). Settings apply across the panel including login and error pages. by @nayskutzu
- Animations can be customized app-wide: choose Full, Reduced (default), or Off. Controlled from the theme palette and from the background settings dialog. by @nayskutzu
- Many new motion and animation improvements: page content fades in on load, cards and server cards have hover lift and scale, dashboard server list uses staggered entrance, welcome banner scales in, and new global utilities (fade-in-up, scale-in, slide-in-right, pulse-soft, glow, hover-lift, hover-scale, stagger-children) for consistent polish across the panel. by @nayskutzu
- Introduced seamless Ctrl+S (or Cmd+S) keyboard shortcut support in the file manager-enabling quick and convenient file saving. by @nayskutzu
- Default user profile pictures now automatically use the panel’s app logo URL for a more unified look. by @nayskutzu
- Admin users can now seamlessly access and view all servers directly from the dashboard page. by @nayskutzu
- Expanded theme customization options for enhanced personalization and flexibility. by @nayskutzu
- Upload progress is now visually displayed in the file manager, providing real-time feedback during file uploads. by @nayskutzu
- Admins can now enforce specific customization options for all users, ensuring a consistent experience across the panel. by @nayskutzu
- Added robust support for IP spoofing simulation and enhanced anti-griefing protections in demo mode to ensure a safer, more flexible testing environment. by @nayskutzu
- Introduced advanced filtering options on both the servers and users pages, enabling a more powerful and intuitive search experience. by @nayskutzu
- Introduced bulk power controls for servers, allowing administrators and clients to perform mass start, stop, and restart actions effortlessly. by @nayskutzu
- Launched a powerful new integrated development environment (IDE) for seamless and efficient server file management! by @nayskutzu
- Expanded font support throughout FeatherPanel, introducing additional typeface options and updating the default system font for a refreshed look and improved readability. by @nayskutzu

### Fixed

- Enhance error handling in database operations by @nayskutzu
- Fixed an issue where subusers lacked write permissions for file editing. by @nayskutzu
- Fixed an issue where servers appeared unassignable or were visually misplaced in certain areas of the interface. by @nayskutzu
- Resolved an issue where internal notes could inadvertently become visible to users within the tickets area. by @nayskutzu
- Fixed an issue in Firefox where both the fallback and user avatar would display simultaneously. by @nayskutzu
- Fixed an issue where the chatbot would display even when disabled. by @nayskutzu
- Schedules stuck in “processing” and not deletable by @nayskutzu
- Schedules running instantly / ignoring time by @nayskutzu
- Enhanced server search to deliver results across all pages, providing a seamless and unified search experience. by @nayskutzu

## v1.2.4 STABLE

### Added

- Added support for FastDL, enabling accelerated downloads for games utilizing the FastDL protocol. by @nayskutzu
- Extend log viewer functionality to include mail logs and update UI for log management by @nayskutzu
- Implement node setup command retrieval and Wings configuration generation; enhance admin routes and frontend integration for improved user experience by @nayskutzu

### Fixed

- Resolved an issue where several translation strings were missing, ensuring a more complete and consistent localized experience. by @nayskutzu
- Update progress bar rendering to conditionally display based on resource limits in ServerInfoCards component by @nayskutzu
- Update avatar URL generation in SessionController to use application base URL, ensuring correct path for user avatars by @nayskutzu
- Add installation status messages to English locale file for improved user feedback by @nayskutzu
- Simplify SMTP configuration checks in AMailSender, setting default values for encryption and port by @nayskutzu
- Enhance error handling for stale versions with user prompts in English locale by @nayskutzu
- Reintroduce protocol selection in server firewall page with improved layout by @nayskutzu
- Update admin settings navigation to redirect to the correct settings page by @nayskutzu
- Resolved an issue where the nodes page would incorrectly redirect users back to the locations page. by @nayskutzu
- Fixed an issue preventing input in the PERPLEXIY AI agent configuration panel, ensuring users can now update settings as expected. by @nayskutzu
- Fixed an issue where the SSO link copy function was not working in admin user settings. by @nayskutzu
- Fixed an issue where the SFTP copy button was not functioning properly in the server settings. by @nayskutzu
- Fixed an issue where servers with 0MB RAM were incorrectly handled as having 0MB memory, ensuring proper default memory allocation. by @nayskutzu
- Enhance Docker image selection in server creation process by @nayskutzu

### Improved

- Enforce strict view_all handling in ServerUserController and dashboard to ensure only user-owned servers are displayed by @nayskutzu
- Reimplement and re-organize cron jobs with new naming conventions, including data cleanup, zero trust scanning, and mail sending. by @nayskutzu
- Implement filter dialog for server activities with localization support by @nayskutzu
- Added cache control headers to ensure HTML is always served fresh and prevent unwanted caching. by @nayskutzu
- Admins can now add themselves as subusers to servers, but are restricted from being added as server owners. by @nayskutzu
- Introduce analytics settings in user profile enable external analytics script loading based on user preference. by @nayskutzu

## v1.2.3 STABLE

### Fixed

- Resolved an issue where scheduled cronjobs were not executing as expected, ensuring reliable automation. by @nayskutzu

## v1.2.2 STABLE

### Fixed

- Fixed an issue where creating an admin user would incorrectly assign them the moderator role due to array length handling errors. by @nayskutzu
- Resolved an issue where server allocation would fail during the creation of a new server, ensuring allocations now work reliably as intended. by @nayskutzu
- Addressed an issue with incorrect profile picture rendering on the users list page, ensuring avatars now display consistently and as intended. by @nayskutzu

## v1.2.1 STABLE

### Fixed

- Resolved an issue affecting the database host selection modal on the server's databases page for a smoother, more reliable user experience. by @nayskutzu
- Fixed the API documentation button so it now functions correctly and directs users to the intended icanhasfeatherpanel endpoint. by @nayskutzu
- Resolved an issue where interacting with the file manager's context menu would unintentionally open files-context menu actions now work as intended. by @nayskutzu
- Fixed an issue where Control + C and copying server console output did not work as expected. You can now reliably copy from the console! by @nayskutzu
- Fixed an issue where selecting multiple files or folders incorrectly showed a download button that hasn’t worked since the Wings migration-this button now functions as expected, ensuring a smoother file management experience. by @nayskutzu
- Addressed occasional inaccuracies in server KPIs caused by Wings misconfigurations, ensuring analytics are now more reliable and reflective of actual server states. by @nayskutzu
- Use unhashed password in email templates after hashing for storage. by @nayskutzu
- Correct command history navigation and indexing in the server terminal. by @nayskutzu

### Improved

- Synchronize admin settings active tab with URL search parameters for persistent navigation. by @nayskutzu
- Cron runner is now using multithreaded processing to process cronjobs. by @nayskutzu
- Implement recently visited server ordering on the dashboard. by @nayskutzu
- Add console filtering rules management and a popout window option to the server terminal. by @nayskutzu
- Change default administrator role color to purple. by @nayskutzu

## v1.2.0 STABLE

### Security

- Users are now automatically deauthorized from the Wings connection if server ownership changes or their subuser access is revoked, ensuring tighter account security and access control. by @nayskutzu (CVE GHSA-8c39-xppg-479c)
- Addressed a critical security vulnerability; details are confidential to protect users. by @nayskutzu (CVE GHSA-jw2v-cq5x-q68g)

### Added

- Introduced a completely redesigned and modernized frontend architecture. by @nayskutzu

### Fixed

- Implement route name validation in admin rate limits API, enhancing error handling for invalid requests. Enable debug mode across various files for improved troubleshooting during development. by @nayskutzu
- Improve plugin directory handling in PluginManager by adding checks for empty directories and ensuring only directories are returned, enhancing plugin management reliability.
- Ollama integration is now fully functional-issues preventing it from working have been resolved! by @nayskutzu
- Resolved several issues affecting the reliable saving and persistence of rate limits. by @nayskutzu

### Updated

- Upgraded the primary database engine to MariaDB 12. by @nayskutzu
- Updated the caching layer to Redis 8 for improved efficiency. by @nayskutzu

## v1.1.2 STABLE

### Added

- Plugins can now seamlessly integrate with and extend existing sidebar routes, including injecting custom previews! by @nayskutzu
- Introduced a seamless option to resynchronize plugin symlinks, ensuring all plugins remain properly linked and up to date. by @nayskutzu
- Added a new, interactive flow for users to delete their own servers-requiring completion of one math, one reading, and one spelling challenge for extra security. by @nayskutzu
- The standard plugins page now also supports update checking, not just the marketplace! by @nayskutzu
- Plugins can now specify a unique cloud plugin ID, enabling them to automatically detect and fetch their own updates from the cloud. by @nayskutzu
- Plugins can now specify an exact panel version requirement, not just an SDK version-offering greater precision and reliability for compatibility! by @nayskutzu
- Introduced the new `--skip-path-check` command-line option, allowing developers and advanced users to bypass automatic path validation when running CLI actions. by @nayskutzu
- Instantly sync your appearance settings to the cloud with the new one click option-no more 5-minute wait times. by @nayskutzu
- Added the ability to query user data by external_id and server data via the admin API. by @nayskutzu
- The API documentation has been significantly enhanced with detailed versioning and additional metadata, offering clearer and more accurate information. by @nayskutzu
- Plugin Widgets now intelligently detect and adapt to their initialization page, enabling more context-aware behavior and seamless integration. by @nayskutzu
- Added a streamlined option to automatically reinstall any plugins removed during a panel update, eliminating the need for manual reinstallation. by @nayskutzu
- You can now seamlessly download premium plugins directly, once your panel is linked to your FeatherCloud account. by @nayskutzu
- Seamless FeatherCloud OAuth2 integration now available-securely link your panel to the cloud in just a few clicks! by @nayskutzu

### Improved

- Significant performance enhancements-optimized resource usage for a faster, more efficient app experience. by @nayskutzu
- Plugin dependency checks are now performed directly via config files instead of in-memory loading, preventing possible conflicts and ensuring more reliable operation. by @nayskutzu
- Plugin-rendered pages now feature improved layouts with the footer automatically hidden, resulting in a cleaner, more spacious, and visually appealing experience. by @nayskutzu

### Removed

- Removed the unused global context menu for a cleaner, more streamlined experience. by @nayskutzu
- The API debug menu is now disabled in production, helping conserve resources and further boost app performance. by @nayskutzu
- The popular plugins section now displays correctly and reliably highlights top plugins. by @nayskutzu

### Fixed

- Resolved an issue where the server proxy page could crash when enabling Let's Encrypt due to a conflict with the language manager. by @nayskutzu
- Fixed an issue preventing registry packages from being detected and found correctly. by @nayskutzu

## v1.1.1 STABLE

### Fixed

- Plugins now support rendering multiple pages, enabling richer and more versatile plugin experiences! by @nayskutzu
- Resolved an issue where backup downloads were unavailable due to JID and JWT token handling errors; downloads now work seamlessly. by @nayskutzu
- Resolved an issue where large archives were failing to complete and timing out during the archiving process. by @nayskutzu
- Resolved an issue where the admin.dashboard.view permission was not being recognized in the frontend, ensuring proper access control for admin features. by @nayskutzu

### Improved

- Plugins now support grouped navigation sections on both dashboard and admin pages, enabling more organized and intuitive plugin experiences! by @nayskutzu
- The admin page now automatically hides tickets, knowledgebases, and other modules when disabled, creating a cleaner and more focused interface. by @nayskutzu

### Added

- Introduced a dedicated user detail page for viewing and editing users, replacing the previous drawer approach-delivering a much improved and more intuitive UX/UI. by @nayskutzu

## v1.1.0 STABLE

### Fixed

- Resolved multiple common captcha-related issues, ensuring a smoother and more reliable verification experience. by @nayskutzu
- Enhanced input validation on the server startup page with improved regex checks, replacing unclear "validation failed" errors with more informative messages. by @nayskutzu
- Fixed an issue where extra server allocations were not properly unassigned when a server was deleted. by @nayskutzu
- Fixed an issue where auto-assigning an allocation to a server would fail unless exactly 100 free allocations were available. by @nayskutzu
- Improved error handling for /server routes: pages now gracefully display the API error message when a request fails, ensuring clearer feedback for users. by @nayskutzu
- Enhanced the success notification for password reset requests, providing users with a clearer and more polished confirmation when a reset link is sent to their email address. by @nayskutzu
- Improved autoscroll behavior for a smoother and more consistent user experience. by @nayskutzu
- Status pages, tickets, and knowledgebases will now be automatically hidden from the sidebar when disabled, ensuring a cleaner and more relevant navigation experience!

### Added

- Powerful Wings modules support: create custom modules for Wings and seamlessly manage them through integrated admin pages in the panel. by @nayskutzu
- Introduced robust "Always Online" server support-now featuring customizable MOTD and kick messages for a seamless, uninterrupted player experience. by @nayskutzu
- Introduced a powerful and intuitive firewall manager for servers, easily enabled through the settings area, providing enhanced security and effortless control. by @nayskutzu
- Seamless phpMyAdmin integration: effortlessly install, upgrade, and access phpMyAdmin directly through FeatherPanel for powerful database management. by @nayskutzu
- Introduced an intuitive allocation template for creating new allocations, making the process faster and easier than ever! by @nayskutzu
- Powerful custom CSS and JavaScript injection: admins can now easily inject their own CSS and JS through the settings panel for deep customization and tailored user experiences. by @nayskutzu
- Introduced an automated update checker for nodes, ensuring you always stay informed about the latest available updates. by @nayskutzu
- Introduced an experimental Redis-backed cache layer, offering an alternative to traditional file-based caching for improved performance and scalability. by @nayskutzu
- Introduced robust API rate limiting to effectively safeguard against abuse and ensure fair use for all users. by @nayskutzu
- Newly registered panel users now receive their password details directly in their welcome email, making onboarding smoother and more convenient. by @nayskutzu
- Introducing elegant image previews in the file manager-supported image formats now display crisp, in-panel thumbnails for a more intuitive and visually engaging browsing experience. by @nayskutzu
- Introduced advanced server reverse proxy support, allowing you to seamlessly expose server ports to the web with optional SSL certificate integration for secure connections! by @nayskutzu
- Introducing seamless server import capabilities: effortlessly migrate servers from other hosts using SFTP or FTP with a powerful, intuitive importer! by @nayskutzu
- Added granular control to zero trust verification: now you can selectively skip zero trust checks on individual servers if desired, providing greater flexibility and customization. by @nayskutzu
- Added the ability to seamlessly edit a server's external ID, offering enhanced flexibility and management control. by @nayskutzu
- Introduced fully public knowledgebases, allowing anyone to access helpful documentation and resources without needing to log in. by @nayskutzu
- Introduced fully public status pages, allowing anyone to view real-time server and system status without logging in. by @nayskutzu
- Added a user-friendly cookies consent banner to ensure compliance with EU regulations and provide greater transparency for panel visitors. by @nayskutzu
- Introduced an elegant and informative loading screen that appears while FeatherPanel is starting up, ensuring users are greeted with a polished experience even before the panel is fully ready. by @nayskutzu

### Improved

- No more frustrating page refreshes after failed captcha attempts-requests to captcha-protected endpoints are now automatically retried for a seamless experience! by @nayskutzu
- Revamped node management interface: each node now has its own dedicated page for an improved and more intuitive management experience. by @nayskutzu
- Log uploads now use the FeatherPanel API instead of mclogs, providing a more seamless and integrated experience. by @nayskutzu
- Bulk deletion of allocations now offers the flexibility to target and remove allocations from a specific subnet, empowering more precise management. by @nayskutzu
- Developer plugin creation has been completely revamped, now offering a streamlined and intuitive experience for effortless management and customization. by @nayskutzu
- Optimized mail sending: the system now processes only pending emails, significantly improving efficiency and performance! by @nayskutzu
- Introduced the option to restrict users from switching realms, providing enhanced administrative control and flexibility. by @nayskutzu

## v1.0.6 BETA

### Fixed

- Resolved an issue where user server pagination was not functioning correctly; pagination now works as intended. Fixed by
  @nayskutzu
- The Pterodactyl importer page has been significantly improved-it now reliably displays your actual API key for seamless integration! by @nayskutzu
- Enhanced the Pterodactyl importer page with clear, user-friendly labels for improved navigation and ease of use. by @nayskutzu
- Resolved various mobile UI issues on the server resources page for a smoother, more polished user experience. by @nayskutzu
- Resolved longstanding issues with server transfers in FeatherPanel: transfers are now fully functional and reliable. by @nayskutzu
- Resolved a query error that occurred when a database host was associated with active servers. by @nayskutzu
- Resolved an issue preventing EULA and egg/spell features from functioning correctly-these are now properly included in server requests, restoring expected functionality. by @nayskutzu
- Fixed an issue where role names and colors were not properly displayed on the frontend; these are now shown as intended. by @nayskutzu
- Resolved an issue preventing JSON files from being opened and edited; you can now seamlessly edit JSON files as intended. by @nayskutzu
- Improved the handling of the --skip-os-check flag: the installer will now correctly honor this option even if /etc/os-release is missing, ensuring a smoother and more flexible installation experience. by @nayskutzu
- Plugin-rendered pages now feature customizable sidebars, enabling a more intuitive and seamless user experience! by @nayskutzu

### Added

- Users can now log in using their usernames for greater convenience and flexibility. by @nayskutzu
- New users are now automatically logged in right after registration, providing a seamless onboarding experience. by @nayskutzu
- Admins can now effortlessly view and manage all servers directly from the dashboard, streamlining oversight and administration. by @nayskutzu
- Introduced a dedicated server ping card to the server list for clearer connection insights, and relocated the UUID for improved accessibility. by @nayskutzu
- Introduced a new feature that allows users to select their preferred server allocation from available options (disabled by default in settings). by @nayskutzu
- Added the ability for administrators to restrict users from changing specific profile details, such as their username, first/last name, or email address, for enhanced control and security. by @nayskutzu
- Introduced a new feature allowing administrators to restrict user access to the client API for enhanced security and control. by @nayskutzu
- Implemented API documentation caching for significantly faster load times in production environments. by @nayskutzu
- Enhanced server locations with vibrant country flags for a fresh, modern look! by @nayskutzu
- Introduced a built-in Knowledgebase, allowing users to easily access essential documentation directly within FeatherPanel-no need for third-party solutions! by @nayskutzu
- Introduced a sleek and informative Status Page for users! When enabled, it provides real-time insights into node statuses and other key system information, enhancing transparency and monitoring. by @nayskutzu
- Introduced seamless SSO authentication support, enabling integration with WHMCS and other external platforms for a unified login experience. by @nayskutzu
- Rolled out a comprehensive, user-friendly ticket system packed with advanced features and thoughtful enhancements for a seamless support experience. by @nayskutzu
- Plugins can now create custom sidebar groups for server actions, allowing enhanced organization and grouping of plugin-related features directly in the server sidebar. by @nayskutzu
- Introduced 15 stunning new base color themes for the FeatherPanel UI, allowing you to effortlessly personalize your experience with vibrant, modern palettes. by @nayskutzu
- Added comprehensive plugin event support for database snapshot operations (create, restore, delete, download), enabling plugins to hook into database management workflows. by @nayskutzu
- Added plugin event support for cloud plugin installation, allowing plugins to react to marketplace plugin installations and updates. by @nayskutzu
- Implemented comprehensive activity tracking for database snapshot operations (create, restore, delete, download) to provide detailed audit logs for administrative actions. by @nayskutzu
- Added activity tracking for cloud plugin installations and updates, ensuring all marketplace plugin operations are properly logged for security and auditing purposes. by @nayskutzu

### Updated

- Native support for PHP 8.5! FeatherPanel is now fully compatible with the latest PHP release, ensuring optimal performance and future-proofing your deployments. by @nayskutzu

## v1.0.5 BETA

### Fixed

- Improved TOTP page by fixing Cloudflare Turnstile integration and correcting displayed text. by @nayskutzu
- Added missing Cloudflare Turnstile verification to the account update page for improved security. by @nayskutzu
- Resolved an issue where commands could not be sent unless the server was running, ensuring smoother server management. by @nayskutzu
- Fixed an issue where the SFTP connection string included the username, preventing proper detection by WinSCP. by @nayskutzu

### Added

- Added seamless integration with Perplexity AI, allowing you to use advanced AI-powered chat capabilities right within FeatherPanel.
- Refactored the Zero Trust system for greater clarity and user-friendliness, making security features easier to understand and configure for beginners. by @nayskutzu
- Introduced powerful database snapshot tools, empowering developers to easily create and restore database snapshots, streamlining the process of reverting changes during development. by @nayskutzu
- Added support for standalone database hosts that operate independently of a node host, streamlining migrations from Pterodactyl and enhancing deployment flexibility. by @nayskutzu

### Improved

- Added support for configuring a custom ChatGPT API endpoint, giving you greater flexibility to use self-hosted or enterprise AI solutions. by @nayskutzu

## v1.0.4 BETA

### Improved

- Relocated the export plugin functionality to the Developer Plugin SDK page, ensuring only developers can export plugins and preventing unintended or unauthorized sharing. by @nayskutzu
- Moved the online spells directory into the FeatherPanel Marketplace for improved visibility and easier access. by @nayskutzu
- Added dedicated admin sidebar routes for Zero Trust Security and Thread Intelligence Server (TIS), making these advanced protections and analytics easier to access for administrators. by @nayskutzu
- Enhanced installer UI with automatic screen clearing between menus for a cleaner, more professional appearance. by @nayskutzu
- Improved Cloudflare Tunnel configuration - the installer now properly merges ingress rules instead of overwriting them, allowing multiple hostnames to coexist on the same tunnel without conflicts. by @nayskutzu
- Better DNS record handling - the installer now checks for existing DNS records and updates them instead of creating duplicates when configuring Cloudflare Tunnel. by @nayskutzu
- Streamlined installation flow - domain is now requested immediately when selecting Nginx or Apache, allowing for faster SSL certificate creation and reverse proxy setup. by @nayskutzu
- Removed redundant prompts - Cloudflare-related messages and credential prompts no longer appear when users select Nginx or Apache, providing a cleaner installation experience. by @nayskutzu
- Improved error handling and logging throughout the installer for better diagnostics and troubleshooting. by @nayskutzu

### Added

- Allow compression of files in the right click context menu. by @puttydotexe
- Introduced a brand new Marketplace hub, allowing you to easily choose between installing spells, plugins, or AI agents, all from one unified area. by @nayskutzu
- Empower users with complete theme customization easily personalize the entire look and feel of FeatherPanel to match your unique style! by @nayskutzu
- Unleash your creativity with full Accent Color customization-easily personalize the app’s primary color scheme to reflect your individual style! by @nayskutzu
- Introduced a sleek and consistent custom scrollbar for both side panels and the entire app, elevating the overall user experience. by @nayskutzu
- Added an automated FeatherTrust scan report button to the FeatherZero Trust page, enabling instant access to security scan reports with a single click! by @nayskutzu
- Introduced FeatherAI, an intelligent AI-powered chatbot assistant built into FeatherPanel, enabling users to get instant help, perform actions, and receive expert guidance right within the app. by @nayskutzu
- Added global `featherpanel` CLI command that wraps `docker exec -it featherpanel_backend php cli` with all arguments, making it easy to run CLI commands system-wide (e.g., `featherpanel help`, `featherpanel users list`). The command is automatically installed during Panel installation and updated during Panel updates. by @nayskutzu
- Unified access method selection menu - users now see all options (Cloudflare Tunnel, Nginx, Apache, Direct Access) in a single menu instead of multiple prompts, providing a cleaner and more intuitive installation experience. by @nayskutzu
- Automatic SSL certificate setup during initial installation - when selecting Nginx or Apache, users can now create SSL certificates immediately and have the reverse proxy automatically configured with HTTPS, eliminating the need to manually configure SSL later. by @nayskutzu
- Smart Cloudflare Tunnel management - tunnels now use unique names based on hostname to prevent conflicts when installing on multiple servers. The installer intelligently detects existing tunnels and offers to reuse them or create new ones, preventing accidental overwrites. by @nayskutzu
- Automatic Certbot plugin installation - when users select Nginx or Apache during installation, the installer automatically installs the corresponding Certbot plugin without prompting, streamlining the SSL setup process. by @nayskutzu
- Added an advanced Wings configuration file editor in the admin area, enabling effortless direct editing and management of Wings daemon settings. by @nayskutzu
- Release notes are now written in markdown, enabling enhanced formatting and a more visually appealing presentation. by @nayskutzu
- Added a stylish and dedicated section to display user social links on navbar, making it easy to connect and showcase your online presence. by @nayskutzu
- Introduced a feature that lets you pin your favorite pages for easy access-quickly save and revisit the places you care about most! by @nayskutzu

### Fixed

- Fixed an issue that prevented empty files from being edited, ensuring seamless editing regardless of file size. by @nayskutzu
- Fixed an issue where attempting to install premium plugins would get stuck on the details page instead of displaying an appropriate message. by @nayskutzu
- Fixed missing pagination UI and incorrect pagination display for server backups, schedules, tasks, and databases. All pages now properly display pagination controls with accurate "Showing X-Y of Z" information and page navigation when there are more items than the per-page limit. by @nayskutzu
- Fixed issue where SSL certificates were created but nginx/apache wasn't automatically configured to use them on port 443. by @nayskutzu
- Fixed Cloudflare Tunnel overwrite issue - installing on multiple servers with the same tunnel name no longer overwrites existing tunnel configurations. by @nayskutzu
- Fixed redundant plugin selection prompt - users who selected Nginx or Apache no longer see the Certbot plugin selection menu again during SSL setup. by @nayskutzu
- Fixed variable scope issues in the installer script to prevent potential bugs. by @nayskutzu
- Fixed shellcheck warnings and errors for improved code quality and reliability. by @nayskutzu
- Fixed an issue where the "Validate Server" and "Create Folder" buttons would incorrectly appear in the node folder view within the server list.

## v1.0.3 BETA

### Removed

- Removed the "Set Primary" button from the server edit page to prevent user confusion and streamline the allocation management experience. by @nayskutzu
- Removed the "Create Node" option from the Locations page, as it was just a legacy placeholder left over from the original panel build. by @nayskutzu
- Retired the legacy "FeatherCli" in anticipation of an all-new, much faster and more powerful CLI tool that will be released in a dedicated repository! by @nayskutzu
- Cleaned up outdated FeatherPanel SEO metadata to ensure a cleaner user experience and eliminate unnecessary empty branding. by @nayskutzu

### Fixed

- Resolved an issue preventing plugins from registering their own dashboard pages. by @nayskutzu
- Fixed an issue where the subdomain manager would fail if an allocation did not have an ip_alias and the allocation IP was not public. by @nayskutzu
- Improved session security by excluding "two_fa_key" from session responses. by @nayskutzu
- Resolved issues preventing drag-and-drop file uploads from working in Chrome, ensuring seamless and reliable file uploads across all modern browsers. by @nayskutzu
- QR code now uses the authenticated user's email to ensure correct account association. by @puttydotexe
- Fixed an issue where clicking auth page links (such as register or login) would cause a full application reload due to broken redirects, providing a smoother navigation experience. by @nayskutzu
- Fixed an issue that could cause your customizations to be lost if localStorage failed to sync properly! by @nayskutzu

### Added

- The migration CLI now fully supports running plugin-provided migrations, enabling seamless updates and database changes for all your plugins! by @nayskutzu
- The migration interface in the admin panel now fully supports executing migrations provided by plugins, enabling streamlined database updates for all installed plugins! by @nayskutzu
- Added support for specifying public IPv4 and IPv6 addresses on nodes, enhancing subdomain manager functionality and enabling broader networking capabilities. by @nayskutzu
- Significantly expanded plugin widget customization options power users and plugin developers can now personalize widgets to their heart's content! by @nayskutzu
- Added FeatherCloud handshake support, allowing seamless and secure linking of your panel to a FeatherCloud account! by @nayskutzu
- Introduced FeatherPanel Zero Trust Security: servers are now automatically scanned for malware and threats, enhancing protection and peace of mind! by @nayskutzu
- FeatherPanel Thread Intelligence Server (TIS): introduces advanced real-time malware and threat detection, empowering your panel with cutting-edge active protection and intelligent security analytics for all managed servers. Powerd by FeatherWings TIS and FeatherCloud TIS! by @nayskutzu
- Added support for a FeatherPanel plugin export ignore file, allowing you to exclude packages and third-party dependencies that are used during plugin development but should not be included in the final exported plugin. by @nayskutzu
- Add nayskutzu pointer to non-disabled buttons to improve UI clarity. by @puttydotexe
- Introduced context-aware tooltips for various admin actions throughout FeatherPanel menus, providing clearer guidance and an improved user experience! by @nayskutzu
- Two-factor setup now redirects to the intended page after successful verification (short delay for UX). by @puttydotexe
- OTP input updated to allow numeric entry with autocomplete for easier entry on devices. by @puttydotexe
- Brand new plugin marketplace system with powerful update support! The marketplace now offers advanced search and filtering options (search by tags, verified status, sorting, and more), making it much easier to discover exactly what you need. The system now enforces compatibility and permission checks, preventing users from installing plugins that are incompatible with their panel version or missing required dependencies, for a safer and smoother experience. by @nayskutzu
- Introduced a powerful notification service that allows administrators to send beautiful, informative messages to all users. by @nayskutzu

### Improved

- Improved how user emails are fetched: they now use a dedicated paginated route to avoid excessive memory usage and return results more efficiently. by @nayskutzu
- Activity fetching is now significantly optimized and has its own dedicated route, dramatically reducing memory usage when retrieving user activity data. by @nayskutzu
- Cleaned up the session response: password hashes and unnecessary data are no longer included. by @nayskutzu
- Moved layout and organization-related controls (such as sorting, filtering, and view toggles) into a new "View Layout" dropdown for a cleaner and less cluttered user interface. by @nayskutzu
- Fixed a significant layout shift on the user information tab in the admin panel by adding a minimum height tab switching is now smooth and avoids jarring jumps. by @nayskutzu
- Polished the design of authentication pages for a more professional and visually appealing user experience. by @nayskutzu
- Now using Rolldown Vite as the compiler for faster build times and improved overall usage experience. by @nayskutzu
- Server transfer node destination selection will now prevent selecting of the servers current node and any unhealth node. by @puttydotexe
- index.html is now automatically compressed and minified during production builds, delivering noticeably faster load times and a more responsive panel experience. by @nayskutzu

## v1.0.2 BETA

### Added

- Added an enhanced editor specifically for Minecraft server.properties files, allowing for easier configuration and improved editing experience.
- Added an enhanced editor specifically for Paper Spigot spigot.yml files, allowing for easier configuration and improved editing experience.
- Added an enhanced editor specifically for Paper bukkit.yml files, allowing for easier configuration and improved editing experience.
- Added an enhanced editor specifically for vanilla default files, allowing for easier configuration and improved editing experience.
- Built-in subdomain manager now available for all users at no additional cost.
- Added the ability to retrieve comprehensive system diagnostics directly from the admin panel for easier troubleshooting and insight.
- You can now seamlessly update Wings directly from the admin panel, making upgrades faster and easier than ever before!
- Added full Wings terminal integration-execute system commands directly on your Wings server from the panel!
- The panel now updates itself automatically whenever FeatherPanel is restarted this ensures you’re always running the latest version without manual intervention. This feature can be disabled in your docker-compose.yml if desired.

### Fixed

- Fixed an issue where attempting to delete an allocated port (in either admin or user mode) could result in an error or database rejection.
- Introduced seamless pagination to the Spells page for improved navigation and usability
- Added seamless pagination to the Plugins page for improved navigation and user experience
- Fixed a bug where memory usage was displayed incorrectly (showing "4.0 KB MiB" instead of the actual value such as "4.0 GiB") on the server dashboard when the server had unlimited memory allowance.
- Fixed an issue where creating a scheduled task required entering a payload even when it was marked as optional payload is now truly optional as intended.
- Fixed an issue where schedules did not properly enforce the server backup limit.
- Resolved build issues encountered with the latest versions of Vue, Vite, and TypeScript, ensuring full compatibility and smoother development experience.
- Resolved an issue causing server schedules to malfunction, restoring full scheduling functionality
- Missing translations strings in some pages!
- Error reporting and warnings are now automatically silenced in production mode for a cleaner user experience.

### Improved

- Reduced excessive and unnecessary log output from the admin dashboard page for a cleaner log experience
- Significantly enhanced the installer for both updates and first-time setups, making the process smoother, more intuitive, and user-friendly!

## v1.0.1 BETA

### Fixed

- Resolved an issue that prevented using Ctrl+C to interrupt processes in the server console-keyboard shortcuts now work as expected.
- Fixed an issue where subuser search filters and the table would appear even when there were no subusers these elements now only show when subusers exist.
- Navigating to a plugin page that does not exist now correctly sends you to the 404 Not Found page.
- Fixed a connection timeout issue that could occur after being idle (AFK) on the console page connections now remain stable during periods of inactivity.
- Fixed an issue where the Postgres driver was not detected, ensuring proper database connectivity.
- Fixed an issue where autoscroll was not functioning properly in the console-the console now automatically scrolls to show the latest output as expected.

### Improved

- When editing file, return to original folder (of the edited file)
- Changed the Console layout button from using `position: fixed` to being placed at the top of the page for a more consistent and integrated interface.
- In the SFTP section of the server settings, clarified that the password is your panel login password and made this visible instead of masked. This helps prevent confusion for users who might otherwise copy the field thinking it's a dedicated FTP password.
- Changed the server list status indicator on the dashboard from text to a colored dot for better visual clarity (green for running, red for offline/stopped, yellow for installing/starting/stopping/suspended/error/unknown).
- Improved the admin server edit interface when changing eggs/spells: switching the server's spell automatically updates the available variables, Docker images, and startup command for consistency and clarity.
- Added support for using 0.0.0.0 or custom user-provided IP addresses as the Wings interface, making it possible to bind to all interfaces or a specific address as needed.
- The server sidebar now displays each server's current status, and action buttons are automatically hidden when unavailable based on server state.

### Added

- Added the ability to create servers without requiring a description.
- Users are now reminded of the default startup command after making changes, ensuring an easy way to restore the original if needed.
- Added a button to the console that scrolls to the bottom, making it easier to quickly view the latest output.
- Users can now edit the startup command for their servers if this is allowed by the panel administrator or server policy.
- Users can now change their server’s egg (installer template) if permitted by the panel administrator or server policy.
- Added real-time upload progress indicators to the file manager for a clearer and more responsive file upload experience!
- Users are now prevented from leaving the file manager while uploads are in progress, ensuring files upload completely without accidental interruption. A prompt will ask you to confirm if you try to leave during uploads.
- Added support for uploading entire folders, making it easy to transfer complex file structures to your server in one step.
- Added a toggle/option to wipe all server files before reinstalling a server. When reinstalling, users can choose to delete all files in the root directory for a clean reset. This is available as an option in the reinstall endpoint and UI.
- Plugin system now supports rendering custom components/widgets on every page, enabling seamless integration of new features and UI enhancements throughout the panel.
- Added support for requiring two-factor authentication (2FA) for admin users. A new setting, "Require 2FA for Admins," is available in the security section of the application settings. When enabled, all admin accounts must configure 2FA to access the admin dashboard.
- Added a new security setting that allows administrators to block users from uploading or changing their profile pictures. When disabled, users are no longer given the option to upload a profile image in their account settings.
- Added a new setting that allows administrators to block the use of subusers for servers. When disabled, users will no longer be able to add or manage subusers on their servers.
- Added a new setting that allows administrators to block the use of Schedules for servers. When disabled, users will no longer be able to create or manage schedules on their servers.
- Enhanced the server list to display real-time status indicators alongside resource usage metrics for each server
- Added support for server thread locking, allowing you to set and enforce the number of threads a server can use for greater control and stability.
- Added support for OOM (Out-Of-Memory) killing, allowing administrators to enable or disable OOM killer for servers that exceed their allowed memory usage, providing better control over server resource limits.

## v1.0.0 BETA

### Added

- Added a helpful reminder dialog to discourage the use of Ctrl+R or F5 to refresh, encouraging users to use built-in refresh options for a smoother experience.
- Added telemetry to FeatherPanel to better understand which features are used most and to guide future feature development.
- Added seamless Discord integration: you can now link your account to Discord and log in using your Discord credentials for a faster, more convenient sign-in experience.
- Added the ability for users to disable (remove) two-factor authentication (2FA) from their account settings if they have previously enabled it, making recovery and device transitions easier.
- When opening the console for a running server, you’ll now automatically see the most recent server logs for a smoother and more informative experience!
- Added support for creating archives in additional formats when compressing files and folders via the file manager. Users can now choose from zip, tar.gz, tgz, tar.bz2, tbz2, tar.xz, and txz formats when creating compressed archives from selected files or directories.
- Added support for custom archive names when compressing files and folders, so you’re no longer limited to the default name.
- Added comprehensive support for subuser permissions, allowing fine-grained control over what each subuser can access or manage.

### Fixed

- Fixed an issue where plugins were not appearing on the server route-plugins now display correctly as intended.
- Fixed an issue where wings was unable to parse the right env for file edit!
- Fixed an issue where databases were not properly removed when deleting a server from the admin interface-server database cleanup now works reliably and automatically.
- Fixed a critical bug where updating server variables would previously delete ALL variables-including read-only and admin-only variables-instead of only modifying the variables provided in the update request.
- Fixed an issue where the sidebar logo could become stuck in dark mode and not update correctly when themes were changed.
- Fixed a broken database schema migration that could cause issues when upgrading from older versions.
- No longer performing JWT renewals over the WebSocket protocol; authentication tokens must now be refreshed via the REST API and re-established by reconnecting the WebSocket when needed.
- Resolved reliability issues with JWT token refresh on server console pages, ensuring seamless authentication and uninterrupted session access.

### Improved

- Improved loading screen performance; loading experience is now noticeably faster.
- Loading screen now supports custom logo and text via app settings or custom branding, reflecting your organization's look and feel even before login.
- Native support for the latest version of TailwindCSS.
- Sensitive fields are now hidden from the settings page to improve security and privacy.

### Updated

- Upgraded `@tailwindcss/vite` to v4.1.16 for improved compatibility and build stability.
- Updated `@types/node` to v24.9.1 for the latest Node.js type definitions.
- Upgraded `@vueuse/core` to v14.0.0 for enhanced Vue composables and features.
- Bumped `reka-ui` to v2.6.0 for new UI components and bugfixes.
- Upgraded `tailwindcss` to v4.1.16 for new utility classes and improved styling engine.
- Upgraded `typescript-eslint` to v8.46.2 for the latest TypeScript linting rules and improvements.
- Upgraded `vite` to v7.1.12 for enhanced dev experience and build reliability.

## v0.0.9-Alpha

### Added

- Added admin analytics dashboard (KPI) for detailed user statistics and insights.
- Added the ability to bulk delete allocations directly from the admin interface for faster cleanup and management.
- Introduced an option to quickly remove all unused allocations in one action, streamlining server resource management.
- Removed the empty content validation for file writes-now only requests with a truly missing (null) body are rejected, allowing writing empty files or clearing content.
- Added an error message when there are no database hosts configured-users will now see a clear notice instead of an unexpected error.
- Added power controls (start, stop, restart, kill) and detailed server resource info to the sidebar when viewing server routes, enabling direct server management and status visibility from the sidebar.
- Added display of the current app version in the admin UI for easier version awareness and debugging.
- Introduced Server Transfers-now available for beta testing! Move servers between nodes seamlessly; feedback welcome as we refine this powerful new feature.
- Added detection and support for classic Minecraft 1.19 "requires running the server with Java 17 or above. Download Java 17 (or above) from https://adoptium.net/" messages to provide users with clear Java requirements.
- Introduced a modern and intuitive Global Context Menu UI, providing convenient right-click actions and a more seamless app-wide user experience.
- User preferences are now saved and synced with the database every 5 minutes!

### Fixed

- Resolved an issue that prevented updating a user's password via the admin UI-admins can now seamlessly modify user passwords from the frontend interface.
- Fixed problems with JWT authentication when connecting to the server console, ensuring reliable and secure access.
- Fixed an issue where redirect links were sometimes broken or incomplete, ensuring full and correct links are now generated.
- Fixed an issue where server allocations would not display as expected in the admin UI; allocations are now properly visible.
- Fixed an issue where destructive action confirmation dialogs (e.g., "Delete Selected", "Delete Unused") were difficult to read in light mode due to poor contrast-these dialogs are now fully legible in both dark and light themes.
- Resolved an issue where avatars and images were not displayed correctly in select column dropdowns, ensuring consistent visuals throughout the UI.
- Fixed a problem where the "empty folder" layout was not shown when a user had no available servers, providing clearer feedback in such cases.
- Resolved an issue with the Quick Links widget, ensuring only valid and functional links are displayed.
- Fixed a bug that prevented files from being completely cleared; empty files can now be saved without issue.
- Fixed an issue where the installer did not automatically install Docker as required for Wings, ensuring a smoother and more reliable Wings installation process.
- The installer now properly stops and frees port 80 before launching a standalone server, preventing conflicts and ensuring successful SSL certificate generation.
- File manager URL not updating when navigating directories-browser history (back/forward) support is now enabled.
- File manager Ctrl + F was not properly focusing the search input-it now works as expected.
- Fixed an issue where the MacDock would disappear after refreshing the page or navigating to a different route-it now stays visible and persistent across navigation.
- Fixed an issue where it was not possible to directly navigate to a specific tab within the account settings page.
- Enhanced the Server List page for mobile devices: simplified the layout, removed folder views (which were impractical on smaller screens), and optimized usability for mobile users.
- Added support for customizable ignored files and folders in the file manager, allowing you to effortlessly hide files or directories you don't want to see.
- Fixed an issue where it was not possible to edit a spell's full set of variables, including rules and field types, from the UI.

### Improved

- Redesigned admin pages to deliver a more modern, visually cohesive experience-replaced old error messages with clean toast notifications for clearer and more user-friendly feedback throughout the admin interface!
- The plugins page has been redesigned to offer a more visually appealing and modern user experience.
- Sidebar navigation now groups admin sections for improved organization and clarity, making it easier to find settings, content, plugins, and system options.
- Introduced a brand new sidebar design for the server client interface, providing a modern look and improved usability.
- Added strict SSH public key validation when creating user SSH keys to prevent invalid key submissions.
- Tables now have a new flag `hideLabelOnLayout` to hide the hide the label from the table but still show in columns!
- Brand new footer design for mobile and pc users (More compact and small)
- Admin and profile page links are now hidden from the user sidebar while you are actively viewing them.
- Added new modals for streamlined allocation and spell selection when editing servers. Selections are now managed via a modern, searchable modal interface rather than older dropdowns.
- Improved Docker Images for Spells: When editing a server, available Docker images are now correctly shown and selectable-images update live with the selected spell.
- Updated the admin UI to feature a more appropriate and visually fitting icon for Roles
- Reordered action buttons in the Realm administration interface for improved visual layout.
- Adjusted spacing in admin widgets to refine vertical and grid gaps for a cleaner UI.
- Introduced a separate dark-mode application logo setting and updated default/public settings and admin configuration accordingly.
- Updated action button styles in the allocations interface to outline, secondary, and destructive variants for clearer visual hierarchy.
- Standardized icon sizing across actions for consistent appearance.
- Adjusted button labels and tooltips (including "Confirm Delete") and preserved health/loading-disabled behaviors for gated actions.
- Updated the FeatherPanel version display format in the authentication message to remove the "v" prefix from the version number.
- Added widget border customization. Each widget can independently toggle borders on or off. Borders are enabled by default, providing flexible control over your widget appearance and workspace personalization.
- The search filter is now reset/cleared when changing directories, preventing stale filters for file manager.
- Migrated multiple context menus across the application to a new library for improved consistency and reliability.
- Updated scrollbar styling across the application for a more refined visual appearance.
- Expanded selection of background images, offering users more ways to personalize their interface.
- Server memory, CPU, or disk values of "0" are now displayed as "Unlimited" throughout the UI for improved clarity.
- Redesigned the spells variable editor for a more intuitive and flexible editing experience.
- Moved toast notifications to the bottom right of the screen for improved visibility and consistent user feedback.

### Updated

- Upgraded `lucide-vue-next` to v0.546.0 for improved icons and SVG optimizations.
- Updated `@eslint/js`, `eslint`, and `@types/node` to latest for enhanced lint coverage and better compatibility.
- Bumped `ace-builds`, `vite-plugin-vue-devtools`, and `vue-router` to their latest versions for improved editor reliability, Vue devtools integration, and routing stability.
- Upgraded `friendsofphp/php-cs-fixer` to v3.89.0 for improved code formatting and PHP CS fixes.
- Installed `phpstan/phpdoc-parser` v2.3.0 to enhance PHPDoc support and static analysis.
- Upgraded `zircote/swagger-php` to v5.5.1 for the latest OpenAPI annotation features and bugfixes.

### Removed

- KernXWebExecutor was removed as no one used it or needed it hence plugins have a better way to inject code!
- Removed theme color selection from the appearance page, as it was unused and no longer necessary.
- Ability to change the background if you are using white mode (Breaks the point of white mode!)

## v0.0.8-Alpha

### Added

- Introduced support for premium plugins-enhance your panel with exclusive addon features!
- Enabled plugin server UUID forwarding for advanced developer integrations.
- Added plugin user UUID forwarding to support custom user tracking and integrations (for developers).
- Allow plugins to optionally hide their name badges in the sidebar for a cleaner look.
- Plugins can now display custom emojis in the sidebar, letting you personalize your navigation even further.
- Added an overlay reload button for plugins in the UI when running in development mode. This allows faster iteration on plugin changes during development.

### Fixed

- Resolved an issue where navigating between plugin-rendered pages wouldn’t work as expected-switching between custom plugin pages is now seamless!

### Improved

- Significantly enhanced the overall UI experience, bringing smoother interactions, sharper visuals, and a more cohesive feel-special thanks to @Tweenty\_ for the design magic!

## v0.0.7-Alpha

### Added

- Added a command history bar in the server console to view previously run commands.

### Fixed

- Resolved an issue with the sidebar avatar positioning when collapsed-now perfectly aligned!
- Addressed a problem where the logo would fail to load until the theme was changed; logos now always appear as expected.
- Fixed an annoying bug that prevented editing spells without features-you can now edit all spells seamlessly.
- Fixed an issue where server variable visibility and permissions were not respected: variables marked as hidden or non-editable by the user were still shown or editable in the UI. Now, user view/edit restrictions for variables are properly enforced.
- Fixed an issue where Docker images for Spells could not be viewed or edited because they weren't displayed in the edit drawer. Docker images are now properly shown and editable.

### Improved

- Realms now display toast notifications for feedback instead of outdated error messages, for a more modern and user-friendly experience.
- Spells now use toast notifications rather than the previous error message system, providing clearer and more consistent feedback.
- Major redesign of the server UI interface on both mobile and desktop for a more playful, cohesive, and engaging experience. The new design improves usability, visual consistency, and overall enjoyment across devices.
- Breadcrumb component redesigned for a much-improved appearance and usability on mobile.
- File editor got a small rewrite to make it even faster and better looking!

### Removed

- Deprecated legacy realm logos-spells now manage logos for a cleaner and unified experience.
- Removed redundant realm author field, as this information is now fully managed by spells.
- Removed the refresh button from server settings as it was unused and unnecessary.

### Updated

- Updated `typescript-eslint` to ^8.46.1.
- Updated `vite` to 7.1.10.
- Updated `vue-router` to ^4.6.0.

## v0.0.6-Alpha

### Added

- Added ability to hard delete servers directly from the UI if the associated node is permanently offline or unreachable. This allows admins to remove orphaned servers from the database when normal deletion isn't possible.
- Added a prominent warning dialog on the admin dashboard if the panel is still configured with the default `APP_URL`. This warning guides administrators to fix their application URL setting and provides clear instructions, as incorrect configuration can cause broken links, failed daemon communication, and security issues. The warning can be temporarily dismissed but will reappear until properly addressed.
- Added new keyboard shortcuts to the file manager for quick access and navigation.
- Added support for Minecraft EULA agreement in the server console. When a server requires EULA acceptance, users are prompted to accept the EULA directly in the UI. On acceptance, the panel writes the necessary `eula.txt` file and attempts to auto-start the server, improving the user experience for Minecraft server setup and compliance.
- Added detection and UI support for server process/PID limit issues. When a server reaches the maximum allowed processes (PID limit), the panel now detects this from the server console output and prompts users with a dialog explaining the issue and suggestions for resolution. Users can also trigger a server restart directly from the dialog. This helps users and admins troubleshoot and resolve "process limit reached" errors more easily.
- Added detection and UI support for Java version mismatch in the server console. When the server output indicates an incompatible or unsupported Java version, users are prompted with detailed guidance and suggestions to resolve the issue, including the ability to select compatible Docker images directly in the UI.

### Fixed

- Fixed an issue where filtering logic for Locations, Realms, Nodes, Spells, and Allocations in the server creation/edit UI was showing items from other selections rather than only the relevant filtered subset. For example, selecting a Location would not correctly filter Nodes to just that Location, and Spells were not correctly associated with their Realms. Filtering now respects the current selection so only valid items are shown based on your previous choices on server create/edit pages.
- Fixed a bug where the location page now correctly counts only the nodes owned by each Location, instead of showing all nodes.
- Added support for unlimited values for CPU, memory, and disk in server creation and editing. Setting these fields to `0` now correctly allows for unlimited resources, both in the UI and the backend API validation.
- Fixed an issue where server creation or editing would fail if a required spell variable had a default value and the user did not provide or change it. Now, default values for spell variables are correctly used if the user leaves the field unchanged during server creation or editing.
- Fixed a bug where failed server creations (for example, due to missing or empty required spell variables) were not deleted, causing invalid servers to remain in the database. Now, any server that fails validation during creation is properly cleaned up and not persisted.
- Fixed an issue where the application logo would not load in certain scenarios.
- Fixed an issue where updating an item would inadvertently delete its attachments. Attachments are now preserved during updates.
- Fixed a bug where editing server variables could cause them to break, and once broken, they would not recover even after correcting the input. Server variable validation and updates are now handled correctly so changes are always properly validated and saved.
- Fixed an issue where updating user passwords sometimes failed silently and did not actually update the password as expected. Password changes in the UI and API are now reliably saved.
- Fixed an error where attempting to upload logs could result in a PHP "Array to string conversion" This error occurred under certain conditions when processing log arrays for upload, and is now resolved. Log uploads now work without PHP warnings and return correct success responses.
- File manager still used some hardcoded strings now shifted to translation api!
- Filled in many previously missing translation keys to improve localization and provide a more consistent multilingual experience.
- Console filters are back so you can

### Removed

- Removed deprecated legacy addons that were no longer necessary or compatible with the current system.

### Improved

- Added persistent list view mode: when users switch between list and other views, their choice is now remembered and automatically restored next time they visit.
- Server Activity system has been completely rewritten for much faster performance, richer detail, and a greatly improved UI. The new system provides deeper insights into actions, features more detailed metadata, allows advanced filtering, and loads activity logs significantly faster. The updated frontend offers a more intuitive and visually appealing experience for reviewing and investigating server activity.
- Expanded file manager functionality to include additional actions and greater flexibility. Users now have access to more file operations and improved tools, making file management easier and more powerful.
- JWT token refresh now works seamlessly in the background and does not require a page reload.
- Fixed an issue where the API logic for server info did not correctly parse and return some components. Now, all relevant components are properly parsed and included in the response payload.

### Updated

## v0.0.5-Alpha

### Added

- Added a new `setup` CLI command to quickly initialize your database and environment settings. This command streamlines configuration for new developers and eases onboarding.
- Added a bunch of new plugin events for almost all remaining admin area functions that didn't previously emit events. This greatly expands plugin extensibility and allows plugins to hook into more actions across Locations, Nodes, Realms, Spells, and others in the admin panel.
- Added a wide range of new plugin events for user and server operations, allowing plugins to hook into user actions and server management processes across the user areas.
- License headers are now injected automatically in nearly every file as part of the build and linting process.
- Switched license to MIT
- Added a new `logs` CLI command that allows uploading logs from the command line for diagnostics and support.
- Added a new `settings` CLI command to allow toggling settings directly from the command line for easy configuration management.
- Added a new `users` CLI command for managing users from the CLI, including creating, updating, and deleting user accounts.
- Added comprehensive unit tests for more core admin controllers.
- Added initial `.nayskutzu/rules/*` files, enabling extensive and fine-grained codebase navigation and enforcing coding standards across CLI commands, controllers, chat models, and routes for improved consistency and contributor onboarding.
- Added "Pull file" support to the file manager, enabling users to pull/download files directly from remote URLs into the server. Manage and monitor remote downloads in real time from the Active Downloads panel.
- Added automatic route indexing for plugins: Rather than requiring each plugin to register its own API routes during the app ready event, the route indexer now automatically discovers and loads routes from a `Routes` folder within each plugin. This simplifies plugin development-just place your route files in a `Routes` directory in your plugin, and they’ll be auto-registered without manual setup!
- Added full support for PostgreSQL databases, enabling seamless integration and management alongside MySQL and MariaDB.
- Added support for users to upload their server and install logs to mclo.gs for easy sharing and diagnostics.
- Added support for unique request IDs (`REQUEST_ID`) throughout backend and frontend responses for improved traceability of API calls, debugging, and support. All API responses now include a `request_id` field, and logs/diagnostics reference this value where possible.
- Added a new `saas` CLI command to enable FeatherPanel SaaS reselling capabilities, allowing users to manage hosted reselling operations via the command line.
- Added new `--no-colors` CLI flag: Disables colored output in all CLI command responses for improved accessibility and easier log parsing.
- Added new `--clean-output` CLI flag: Strips out decorative lines, bars, and extra formatting from CLI output, making results easier to parse for automation tools and scripts.
- Added new `--no-prefix` CLI flag: Outputs raw command responses without the FeatherPanel CLI prefix, allowing for cleaner and more script-friendly output in automated workflows.
- Added dynamic page titles support throughout the frontend. Page titles now automatically reflect the current section, improving navigation and accessibility.
- Added support for dynamic page favicons throughout the frontend. Favicons now update automatically based on application settings and changes.
- Added a new `allocations` field to the server editing UI and API, enabling users to assign and customize ports for their servers directly during server management.

## Fixed

- Fixed broken event manager handling in some admin controllers by adding proper null checks before emitting events.
- Fixed an issue where unit tests were failing because the kernel was not booted or called in the test setup. Tests now correctly initialize the application kernel where needed.
- Fixed broken event manager handling in some user controllers by adding proper null checks before emitting events.
- Fixed broken redirect link API endpoints where links could not be deleted, edited, or updated due to incorrect ID handling. All update and delete operations for redirect links now function as expected.
- Resolved issues with API documentation schemas, ensuring the generated API docs are now fully accurate and up-to-date.
- **CRITICAL:** Fixed SQL injection vulnerability in PostgreSQL database creation and deletion operations. Database identifiers are now properly escaped to prevent SQL injection attacks through malicious database names.
- **CRITICAL:** Fixed SQL injection vulnerability in MySQL/MariaDB database creation and deletion operations. Database identifiers are now properly escaped using backtick escaping to prevent SQL injection attacks.
- Fixed minor UI bugs in the server console.
- Fixed UI bugs with deletion buttons: they are now properly styled to be readable and are correctly indexed in the UI.
- Improved UI/UX: Added a hover color for the submit button across the application for more consistent feedback and better user experience. (#42)
- Fixed a bug where the auth screen would not change themes when toggling between dark and light mode.
- Added missing translation keys for "server" and related server actions in all locale files, ensuring UI strings for server management and actions are fully localizable.
- Fixed an issue where the "View" button for servers did not function correctly and the "View Console" button was missing from the server details drawer.
- Fixed an issue where nginx file compression was limited to 2MB on non-Cloudflare tunnel installs. Compression limits have been removed to ensure proper handling of large assets.
- Fixed an issue where the server creation page did not allow setting unlimited values for CPU, disk, and RAM; setting these to 0 will now correctly allow unlimited usage as intended.
- Fixed issues with stats charts: resolved bugs where some performance/resource charts were not displaying or updating correctly on the dashboard and server console pages.
- Egg import didn't import empty values!

### Improved

- Removed redundant double server permission check in server-related API endpoints. All authentication and permission checks are now solely handled by the server middleware, eliminating unnecessary duplicate verification and improving efficiency.
- Migrated all legacy error_log instances to the centralized application logger, resulting in more consistent and effective error handling across the codebase.
- Updated log upload functionality: The CLI and settings log upload commands now use a centralized helper for interacting with mclo.gs, instead of making direct API requests each time. This streamlines the code, reduces duplication, and provides better reliability and error handling for log uploads.
- Improved IP detection for non-Cloudflare hosting providers: The system now properly resolves the client's real public IP even if requests are proxied (e.g., when $\_SERVER['REMOTE_ADDR'] is 127.0.0.1). This ensures accurate detection regardless of Cloudflare or local reverse proxy setups, enhancing audit logging and security tracking.
- CLI experience greatly improved: All CLI commands now leverage centralized color codes and style conventions for a consistent, branded look across help, logs, setup, settings, users, and SaaS commands. Output formatting, error messages, and UI prompts are now unified for a more professional and user-friendly developer workflow.
- Complete redesign of all dashboard and server charts for a significantly improved appearance, enhanced accuracy, and more modern visual presentation. Charts now feature smoother lines, clearer grid lines, improved labels, dynamic coloring, and more precise data rendering for a vastly better user experience.

### Removed

- Removed support for old MongoDB and Redis database types from the database manager, as these cannot be easily managed with user creation via host.

## v0.0.4-Canary

### Added

- Introducing a powerful new plugin UI rendering engine, enabling plugins to seamlessly register custom pages for the dashboard, admin panel, and server views.

## Fixed

- Fixed an issue where ports/allocations where not shared with wings!
- Fixed an issue where uploading logs to mclo.gs would not work if developer mode was not enabled.
- Fixed a bug where updating or creating a Realm with a logo URL would incorrectly display the Realm name as the logo, or fail to update the logo preview. Now, the correct logo is shown after creation or update, and the value is properly applied. (#41)

### Improved

- Enhanced CORS origin protection for improved security
- Server management pages have been renamed throughout the codebase for consistency. All references now use "Server" instead of "Instance" or other variations, ensuring a unified naming convention across the UI and API.
- The logo setting logic has been refactored for improved clarity and maintainability. The dark logo option is now prioritized and applied before the default logo, ensuring correct logo display in both light and dark modes. (#39)
- Standardized the footer across all default mail templates for consistency. All templates now use the same footer style, with the support email address displayed in **bold** for improved clarity. (#40)
- Fixed an issue where some widget buttons were invalid or did not function as expected.

## v0.0.3-Canary

### Added

- Complete redesign of the admin dashboard with a modular widget system
- Versioning system for featherpanel!
- Added a dark logo option for support for fully white mode and dark mode!
- Added a method so you can upload logs from the settings page. This allows admins to easily upload web and app logs to mclo.gs directly from the Settings UI for support and troubleshooting.

### Improved

- Improved file upload inside Docker containers: increased maximum upload size, enhanced reliability, and optimized the file upload service for better performance.
- File editor has received a complete design overhaul for a more modern and user-friendly experience.
- File manager has received a full redesign for improved usability and modern appearance.
- Major design overhaul and improved user experience for the following server management pages: **Backups**, **Databases**, **Schedules**, **Tasks**, and **Subusers**. Each page now features a modernized interface, enhanced empty states, and more intuitive workflows.
- Recreated the entire server console UI using a new console library, resulting in a significantly improved design and much better performance for the server console.

### Fixed

- Added a new private replacePlaceholders() method to both controllers to centralize and standardize placeholder replacement logic.
- Modern placeholders (e.g., {{server.build.default.port}}, {{server.build.default.ip}}, {{server.build.memory}}) are now automatically replaced with actual server values.
- Legacy placeholders (e.g., {{server.build.env.SERVER_PORT}}, {{env.SERVER_PORT}}, {{server.build.env.SERVER_IP}}, {{env.SERVER_IP}}, {{server.build.env.SERVER_MEMORY}}, {{env.SERVER_MEMORY}}) are also replaced with the correct values for compatibility.
- Legacy Docker interface placeholder {{config.docker.interface}} is now converted to {{config.docker.network.interface}} and passed through for Wings to handle, matching Pterodactyl's behavior.
- Replaced remaining instances of "Pterodactyl Wings" branding in the panel with FeatherPanel terminology
- Fixed an issue where renaming files or folders could trigger PHP warnings about undefined array keys "path" and "new_name" in ServerFilesController.php.
- Fixed an issue where creating an archive could result in thousands of unnecessary archives being created instead of a single one.
- Fixed a bug where, during server creation and editing, it was possible to select allocations that were already in use. The system now prevents selection of used allocations up front, instead of only showing an error after submission.

## v0.0.2-Canary

### Fixed

- Wings DNS issues (Try to fix them at least :O)
- API Confirm Deletion button color #30
- Fixed issue where registration appeared disabled even when enabled by default settings

### Added

- KernX Webexecutor (Let users add an keep their custom js injected in the panel!)
- Support to install wings via our install script
- Support to use nginx and apache2 for reverse proxy!

### Removed

- Old swagger dists!

### Improved

- Vite HMR logic!
- Health checks for frontend and backend in docker!

### Updated

- Updated dependencies: @eslint/js, @tailwindcss/vite, @types/node, eslint, tailwindcss, typescript, vite
