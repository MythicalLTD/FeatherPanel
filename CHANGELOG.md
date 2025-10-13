# Changelog

## v0.0.6-Alpha

## Added
- Added ability to hard delete servers directly from the UI if the associated node is permanently offline or unreachable. This allows admins to remove orphaned servers from the database when normal deletion isn't possible.
- Added a prominent warning dialog on the admin dashboard if the panel is still configured with the default `APP_URL`. This warning guides administrators to fix their application URL setting and provides clear instructions, as incorrect configuration can cause broken links, failed daemon communication, and security issues. The warning can be temporarily dismissed but will reappear until properly addressed.
- Added new keyboard shortcuts to the file manager for quick access and navigation.
- Added support for Minecraft EULA agreement in the server console. When a server requires EULA acceptance, users are prompted to accept the EULA directly in the UI. On acceptance, the panel writes the necessary `eula.txt` file and attempts to auto-start the server, improving the user experience for Minecraft server setup and compliance.
- Added detection and UI support for server process/PID limit issues. When a server reaches the maximum allowed processes (PID limit), the panel now detects this from the server console output and prompts users with a dialog explaining the issue and suggestions for resolution. Users can also trigger a server restart directly from the dialog. This helps users and admins troubleshoot and resolve "process limit reached" errors more easily.
- Added detection and UI support for Java version mismatch in the server console. When the server output indicates an incompatible or unsupported Java version, users are prompted with detailed guidance and suggestions to resolve the issue, including the ability to select compatible Docker images directly in the UI.

## Fixed
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

## Removed
- Removed deprecated legacy addons that were no longer necessary or compatible with the current system.

## Improved
- Added persistent list view mode: when users switch between list and other views, their choice is now remembered and automatically restored next time they visit.
- Server Activity system has been completely rewritten for much faster performance, richer detail, and a greatly improved UI. The new system provides deeper insights into actions, features more detailed metadata, allows advanced filtering, and loads activity logs significantly faster. The updated frontend offers a more intuitive and visually appealing experience for reviewing and investigating server activity.
- Expanded file manager functionality to include additional actions and greater flexibility. Users now have access to more file operations and improved tools, making file management easier and more powerful.
- JWT token refresh now works seamlessly in the background and does not require a page reload.
- Fixed an issue where the API logic for server info did not correctly parse and return some components. Now, all relevant components are properly parsed and included in the response payload.

## Updated

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
- Added initial `.cursor/rules/*` files, enabling extensive and fine-grained codebase navigation and enforcing coding standards across CLI commands, controllers, chat models, and routes for improved consistency and contributor onboarding.
- Added "Pull file" support to the file manager, enabling users to pull/download files directly from remote URLs into the server. Manage and monitor remote downloads in real time from the Active Downloads panel.
- Added automatic route indexing for plugins: Rather than requiring each plugin to register its own API routes during the app ready event, the route indexer now automatically discovers and loads routes from a `Routes` folder within each plugin. This simplifies plugin development—just place your route files in a `Routes` directory in your plugin, and they’ll be auto-registered without manual setup!
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
- Improved IP detection for non-Cloudflare hosting providers: The system now properly resolves the client's real public IP even if requests are proxied (e.g., when $_SERVER['REMOTE_ADDR'] is 127.0.0.1). This ensures accurate detection regardless of Cloudflare or local reverse proxy setups, enhancing audit logging and security tracking.
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
