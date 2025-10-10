# Changelog

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

## Fixed

- Fixed broken event manager handling in some admin controllers by adding proper null checks before emitting events.
- Fixed an issue where unit tests were failing because the kernel was not booted or called in the test setup. Tests now correctly initialize the application kernel where needed.
- Fixed broken event manager handling in some user controllers by adding proper null checks before emitting events.

### Improved

- Removed redundant double server permission check in server-related API endpoints. All authentication and permission checks are now solely handled by the server middleware, eliminating unnecessary duplicate verification and improving efficiency.

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
