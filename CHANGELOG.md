# Changelog

## v0.0.3-Canary

### Added

- Complete redesign of the admin dashboard with a modular widget system
- Versioning system for featherpanel!
- Added a dark logo option for support for fully white mode and dark mode!

### Fixed

- Added a new private replacePlaceholders() method to both controllers to centralize and standardize placeholder replacement logic.
- Modern placeholders (e.g., {{server.build.default.port}}, {{server.build.default.ip}}, {{server.build.memory}}) are now automatically replaced with actual server values.
- Legacy placeholders (e.g., {{server.build.env.SERVER_PORT}}, {{env.SERVER_PORT}}, {{server.build.env.SERVER_IP}}, {{env.SERVER_IP}}, {{server.build.env.SERVER_MEMORY}}, {{env.SERVER_MEMORY}}) are also replaced with the correct values for compatibility.
- Legacy Docker interface placeholder {{config.docker.interface}} is now converted to {{config.docker.network.interface}} and passed through for Wings to handle, matching Pterodactyl's behavior.
- Replaced remaining instances of "Pterodactyl Wings" branding in the panel with FeatherPanel terminology

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
