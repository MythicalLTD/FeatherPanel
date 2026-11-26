# Archive checklist for MythicalLTD/FeatherPanel-CLI

Do this **after** the first monorepo `v*` release that publishes `feathercli-*` GitHub assets and Nexus `feathercli_*.deb` packages.

1. Confirm `https://github.com/mythicalltd/featherpanel/releases/latest` includes `feathercli-linux-x64` (and other RIDs).
2. Confirm APT: after configuring MythicalSystems repo, `apt-cache policy feathercli` shows a version.
3. On [MythicalLTD/FeatherPanel-CLI](https://github.com/MythicalLTD/FeatherPanel-CLI), replace `README.md` with a short redirect to `https://github.com/mythicalltd/featherpanel/tree/main/cli`.
4. GitHub → Settings → Danger Zone → **Archive this repository**.
5. Spot-check installer: `FP_CLI_METHOD=direct` and `FP_CLI_METHOD=apt` installs still work.
