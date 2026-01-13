# Changelog

## v1.1.3 STABLE

### Security

- Users are now automatically deauthorized from the Wings connection if server ownership changes or their subuser access is revoked, ensuring tighter account security and access control. by @nayskutzu (CVE GHSA-8c39-xppg-479c)
- Addressed a critical security vulnerability; details are confidential to protect users. by @nayskutzu (CVE GHSA-jw2v-cq5x-q68g)

### Added

- Introduced a completely redesigned and modernized frontend architecture. by @nayskutzu

### Fixed

- Implement route name validation in admin rate limits API, enhancing error handling for invalid requests. Enable debug mode across various files for improved troubleshooting during development. by @nayskutzu

### Updated

- Upgraded the primary database engine to MariaDB 12. by @nayskutzu
- Updated the caching layer to Redis 8 for improved efficiency. by @nayskutzu

## v1.1.2 STABLE

### Added

- Plugins can now seamlessly integrate with and extend existing sidebar routes, including injecting custom previews! by @nayskutzu
- Introduced a seamless option to resynchronize plugin symlinks, ensuring all plugins remain properly linked and up to date. by @nayskutzu
- Added a new, interactive flow for users to delete their own servers—requiring completion of one math, one reading, and one spelling challenge for extra security. by @nayskutzu
- The standard plugins page now also supports update checking, not just the marketplace! by @nayskutzu
- Plugins can now specify a unique cloud plugin ID, enabling them to automatically detect and fetch their own updates from the cloud. by @nayskutzu
- Plugins can now specify an exact panel version requirement, not just an SDK version—offering greater precision and reliability for compatibility! by @nayskutzu
- Introduced the new `--skip-path-check` command-line option, allowing developers and advanced users to bypass automatic path validation when running CLI actions. by @nayskutzu
- Instantly sync your appearance settings to the cloud with the new one click option—no more 5-minute wait times. by @nayskutzu
- Added the ability to query user data by external_id and server data via the admin API. by @nayskutzu
- The API documentation has been significantly enhanced with detailed versioning and additional metadata, offering clearer and more accurate information. by @nayskutzu
- Plugin Widgets now intelligently detect and adapt to their initialization page, enabling more context-aware behavior and seamless integration. by @nayskutzu
- Added a streamlined option to automatically reinstall any plugins removed during a panel update, eliminating the need for manual reinstallation. by @nayskutzu
- You can now seamlessly download premium plugins directly, once your panel is linked to your FeatherCloud account. by @nayskutzu
- Seamless FeatherCloud OAuth2 integration now available—securely link your panel to the cloud in just a few clicks! by @nayskutzu

### Improved

- Significant performance enhancements—optimized resource usage for a faster, more efficient app experience. by @nayskutzu
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

- Introduced a dedicated user detail page for viewing and editing users, replacing the previous drawer approach—delivering a much improved and more intuitive UX/UI. by @nayskutzu

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
- Introduced robust "Always Online" server support—now featuring customizable MOTD and kick messages for a seamless, uninterrupted player experience. by @nayskutzu
- Introduced a powerful and intuitive firewall manager for servers, easily enabled through the settings area, providing enhanced security and effortless control. by @nayskutzu
- Seamless phpMyAdmin integration: effortlessly install, upgrade, and access phpMyAdmin directly through FeatherPanel for powerful database management. by @nayskutzu
- Introduced an intuitive allocation template for creating new allocations, making the process faster and easier than ever! by @nayskutzu
- Powerful custom CSS and JavaScript injection: admins can now easily inject their own CSS and JS through the settings panel for deep customization and tailored user experiences. by @nayskutzu
- Introduced an automated update checker for nodes, ensuring you always stay informed about the latest available updates. by @nayskutzu
- Introduced an experimental Redis-backed cache layer, offering an alternative to traditional file-based caching for improved performance and scalability. by @nayskutzu
- Introduced robust API rate limiting to effectively safeguard against abuse and ensure fair use for all users. by @nayskutzu
- Newly registered panel users now receive their password details directly in their welcome email, making onboarding smoother and more convenient. by @nayskutzu
- Introducing elegant image previews in the file manager—supported image formats now display crisp, in-panel thumbnails for a more intuitive and visually engaging browsing experience. by @nayskutzu
- Introduced advanced server reverse proxy support, allowing you to seamlessly expose server ports to the web with optional SSL certificate integration for secure connections! by @nayskutzu
- Introducing seamless server import capabilities: effortlessly migrate servers from other hosts using SFTP or FTP with a powerful, intuitive importer! by @nayskutzu
- Added granular control to zero trust verification: now you can selectively skip zero trust checks on individual servers if desired, providing greater flexibility and customization. by @nayskutzu
- Added the ability to seamlessly edit a server's external ID, offering enhanced flexibility and management control. by @nayskutzu
- Introduced fully public knowledgebases, allowing anyone to access helpful documentation and resources without needing to log in. by @nayskutzu
- Introduced fully public status pages, allowing anyone to view real-time server and system status without logging in. by @nayskutzu
- Added a user-friendly cookies consent banner to ensure compliance with EU regulations and provide greater transparency for panel visitors. by @nayskutzu
- Introduced an elegant and informative loading screen that appears while FeatherPanel is starting up, ensuring users are greeted with a polished experience even before the panel is fully ready. by @nayskutzu

### Improved

- No more frustrating page refreshes after failed captcha attempts—requests to captcha-protected endpoints are now automatically retried for a seamless experience! by @nayskutzu
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
- The Pterodactyl importer page has been significantly improved—it now reliably displays your actual API key for seamless integration! by @nayskutzu
- Enhanced the Pterodactyl importer page with clear, user-friendly labels for improved navigation and ease of use. by @nayskutzu
- Resolved various mobile UI issues on the server resources page for a smoother, more polished user experience. by @nayskutzu
- Resolved longstanding issues with server transfers in FeatherPanel: transfers are now fully functional and reliable. by @nayskutzu
- Resolved a query error that occurred when a database host was associated with active servers. by @nayskutzu
- Resolved an issue preventing EULA and egg/spell features from functioning correctly—these are now properly included in server requests, restoring expected functionality. by @nayskutzu
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
- Introduced a built-in Knowledgebase, allowing users to easily access essential documentation directly within FeatherPanel—no need for third-party solutions! by @nayskutzu
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
- Unleash your creativity with full Accent Color customization—easily personalize the app’s primary color scheme to reflect your individual style! by @nayskutzu
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
- Introduced a feature that lets you pin your favorite pages for easy access—quickly save and revisit the places you care about most! by @nayskutzu

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
- Add cursor pointer to non-disabled buttons to improve UI clarity. by @puttydotexe
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
- Added full Wings terminal integration—execute system commands directly on your Wings server from the panel!
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

- Resolved an issue that prevented using Ctrl+C to interrupt processes in the server console—keyboard shortcuts now work as expected.
- Fixed an issue where subuser search filters and the table would appear even when there were no subusers these elements now only show when subusers exist.
- Navigating to a plugin page that does not exist now correctly sends you to the 404 Not Found page.
- Fixed a connection timeout issue that could occur after being idle (AFK) on the console page connections now remain stable during periods of inactivity.
- Fixed an issue where the Postgres driver was not detected, ensuring proper database connectivity.
- Fixed an issue where autoscroll was not functioning properly in the console—the console now automatically scrolls to show the latest output as expected.

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

- Fixed an issue where plugins were not appearing on the server route—plugins now display correctly as intended.
- Fixed an issue where wings was unable to parse the right env for file edit!
- Fixed an issue where databases were not properly removed when deleting a server from the admin interface—server database cleanup now works reliably and automatically.
- Fixed a critical bug where updating server variables would previously delete ALL variables—including read-only and admin-only variables—instead of only modifying the variables provided in the update request.
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
- Removed the empty content validation for file writes—now only requests with a truly missing (null) body are rejected, allowing writing empty files or clearing content.
- Added an error message when there are no database hosts configured—users will now see a clear notice instead of an unexpected error.
- Added power controls (start, stop, restart, kill) and detailed server resource info to the sidebar when viewing server routes, enabling direct server management and status visibility from the sidebar.
- Added display of the current app version in the admin UI for easier version awareness and debugging.
- Introduced Server Transfers—now available for beta testing! Move servers between nodes seamlessly; feedback welcome as we refine this powerful new feature.
- Added detection and support for classic Minecraft 1.19 "requires running the server with Java 17 or above. Download Java 17 (or above) from https://adoptium.net/" messages to provide users with clear Java requirements.
- Introduced a modern and intuitive Global Context Menu UI, providing convenient right-click actions and a more seamless app-wide user experience.
- User preferences are now saved and synced with the database every 5 minutes!

### Fixed

- Resolved an issue that prevented updating a user's password via the admin UI—admins can now seamlessly modify user passwords from the frontend interface.
- Fixed problems with JWT authentication when connecting to the server console, ensuring reliable and secure access.
- Fixed an issue where redirect links were sometimes broken or incomplete, ensuring full and correct links are now generated.
- Fixed an issue where server allocations would not display as expected in the admin UI; allocations are now properly visible.
- Fixed an issue where destructive action confirmation dialogs (e.g., "Delete Selected", "Delete Unused") were difficult to read in light mode due to poor contrast—these dialogs are now fully legible in both dark and light themes.
- Resolved an issue where avatars and images were not displayed correctly in select column dropdowns, ensuring consistent visuals throughout the UI.
- Fixed a problem where the "empty folder" layout was not shown when a user had no available servers, providing clearer feedback in such cases.
- Resolved an issue with the Quick Links widget, ensuring only valid and functional links are displayed.
- Fixed a bug that prevented files from being completely cleared; empty files can now be saved without issue.
- Fixed an issue where the installer did not automatically install Docker as required for Wings, ensuring a smoother and more reliable Wings installation process.
- The installer now properly stops and frees port 80 before launching a standalone server, preventing conflicts and ensuring successful SSL certificate generation.
- File manager URL not updating when navigating directories—browser history (back/forward) support is now enabled.
- File manager Ctrl + F was not properly focusing the search input—it now works as expected.
- Fixed an issue where the MacDock would disappear after refreshing the page or navigating to a different route—it now stays visible and persistent across navigation.
- Fixed an issue where it was not possible to directly navigate to a specific tab within the account settings page.
- Enhanced the Server List page for mobile devices: simplified the layout, removed folder views (which were impractical on smaller screens), and optimized usability for mobile users.
- Added support for customizable ignored files and folders in the file manager, allowing you to effortlessly hide files or directories you don't want to see.
- Fixed an issue where it was not possible to edit a spell's full set of variables, including rules and field types, from the UI.

### Improved

- Redesigned admin pages to deliver a more modern, visually cohesive experience—replaced old error messages with clean toast notifications for clearer and more user-friendly feedback throughout the admin interface!
- The plugins page has been redesigned to offer a more visually appealing and modern user experience.
- Sidebar navigation now groups admin sections for improved organization and clarity, making it easier to find settings, content, plugins, and system options.
- Introduced a brand new sidebar design for the server client interface, providing a modern look and improved usability.
- Added strict SSH public key validation when creating user SSH keys to prevent invalid key submissions.
- Tables now have a new flag `hideLabelOnLayout` to hide the hide the label from the table but still show in columns!
- Brand new footer design for mobile and pc users (More compact and small)
- Admin and profile page links are now hidden from the user sidebar while you are actively viewing them.
- Added new modals for streamlined allocation and spell selection when editing servers. Selections are now managed via a modern, searchable modal interface rather than older dropdowns.
- Improved Docker Images for Spells: When editing a server, available Docker images are now correctly shown and selectable—images update live with the selected spell.
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

- Introduced support for premium plugins—enhance your panel with exclusive addon features!
- Enabled plugin server UUID forwarding for advanced developer integrations.
- Added plugin user UUID forwarding to support custom user tracking and integrations (for developers).
- Allow plugins to optionally hide their name badges in the sidebar for a cleaner look.
- Plugins can now display custom emojis in the sidebar, letting you personalize your navigation even further.
- Added an overlay reload button for plugins in the UI when running in development mode. This allows faster iteration on plugin changes during development.

### Fixed

- Resolved an issue where navigating between plugin-rendered pages wouldn’t work as expected—switching between custom plugin pages is now seamless!

### Improved

- Significantly enhanced the overall UI experience, bringing smoother interactions, sharper visuals, and a more cohesive feel—special thanks to @Tweenty\_ for the design magic!

## v0.0.7-Alpha

### Added

- Added a command history bar in the server console to view previously run commands.

### Fixed

- Resolved an issue with the sidebar avatar positioning when collapsed—now perfectly aligned!
- Addressed a problem where the logo would fail to load until the theme was changed; logos now always appear as expected.
- Fixed an annoying bug that prevented editing spells without features—you can now edit all spells seamlessly.
- Fixed an issue where server variable visibility and permissions were not respected: variables marked as hidden or non-editable by the user were still shown or editable in the UI. Now, user view/edit restrictions for variables are properly enforced.
- Fixed an issue where Docker images for Spells could not be viewed or edited because they weren't displayed in the edit drawer. Docker images are now properly shown and editable.

### Improved

- Realms now display toast notifications for feedback instead of outdated error messages, for a more modern and user-friendly experience.
- Spells now use toast notifications rather than the previous error message system, providing clearer and more consistent feedback.
- Major redesign of the server UI interface on both mobile and desktop for a more playful, cohesive, and engaging experience. The new design improves usability, visual consistency, and overall enjoyment across devices.
- Breadcrumb component redesigned for a much-improved appearance and usability on mobile.
- File editor got a small rewrite to make it even faster and better looking!

### Removed

- Deprecated legacy realm logos—spells now manage logos for a cleaner and unified experience.
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
