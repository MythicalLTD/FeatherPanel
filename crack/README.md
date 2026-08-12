# License server dev — team setup (any extension version)

Colleagues often have **different** `devsense.phptools-vscode` versions. Don't hand-edit one `extension.js` — use the patch script on **each machine** after install/update.

## Quick start (every developer)

```bash
# 1. Copy this whole dev/ folder somewhere permanent (repo, shared drive, or copy from this extension)
cp dev/team.env.example dev/team.env
# Edit team.env — set DEVSENSE_LICENSE_API to whoever runs the mock (see below)

# 2. One command
chmod +x dev/setup.sh
./dev/setup.sh

# 3. Reload VS Code / Cursor window
```

## Who runs the mock API?

| Setup | `team.env` |
|--------|------------|
| Everyone runs their own mock | `DEVSENSE_LICENSE_API=http://127.0.0.1:3847/license/` |
| **You** host for the team (LAN) | On your machine: `HOST=0.0.0.0` in `team.env`, run `./dev/setup.sh`. Others set `DEVSENSE_LICENSE_API=http://YOUR_LAN_IP:3847/license/` |

Test from another machine:

```bash
curl -s "http://YOUR_LAN_IP:3847/license/?method=activate_vscode&machine_id=test&api=3.0&key=foo"
```

## Commands

| Command | Purpose |
|---------|---------|
| `./dev/setup.sh` | Patch local extension(s) + start mock server |
| `./dev/setup.sh --patch-only` | Patch only, no server |
| `node dev/patch-license-bypass.mjs --list` | Show installed PHP Tools versions + patch status |
| `node dev/patch-license-bypass.mjs --unpatch` | Restore backups |
| `node dev/license-mock-server.mjs` | Mock API only |

## After a PHP Tools extension update

Updates **replace** `extension.js`. Re-run:

```bash
./dev/setup.sh --patch-only
```

Then reload the window.

## What the patch does

- License always **active** (skips RSA / expiry / blacklist in the extension)
- Activation HTTP → `DEVSENSE_LICENSE_API` (default `http://127.0.0.1:3847/license/`)
- Backs up each `extension.js` to `extension.js.bak.devlicense`

Marker in file: `DEV_LICENSE_BYPASS v1`

## `/etc/hosts` (usually skip)

Production uses **HTTPS** (`https://api.devsense.com`). Hosts → `127.0.0.1` still breaks TLS unless you run HTTPS with a trusted cert for that hostname. Prefer **`DEVSENSE_LICENSE_API=http://…`** as above.

## Turn off dev mode

```bash
node dev/patch-license-bypass.mjs --unpatch
```

Reload the editor. Do not ship patched extensions to customers.
