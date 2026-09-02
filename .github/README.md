<div align="center">

# 🪶 FeatherPanel

**Open-source game server management fast, secure, and built for operators.**

<br />

[![Frontend](https://img.shields.io/github/actions/workflow/status/mythicalltd/featherpanel/frontend.yml?branch=develop&label=Frontend&style=for-the-badge&logo=react&logoColor=white)](https://github.com/mythicalltd/featherpanel/actions/workflows/frontend.yml)
[![Backend](https://img.shields.io/github/actions/workflow/status/mythicalltd/featherpanel/backend.yml?branch=develop&label=Backend&style=for-the-badge&logo=php&logoColor=white)](https://github.com/mythicalltd/featherpanel/actions/workflows/backend.yml)
[![Async Runner](https://img.shields.io/github/actions/workflow/status/mythicalltd/featherpanel/runner.yml?branch=develop&label=Async%20Runner&style=for-the-badge&logo=rust&logoColor=white)](https://github.com/mythicalltd/featherpanel/actions/workflows/runner.yml)
[![Installer](https://img.shields.io/github/actions/workflow/status/mythicalltd/featherpanel/shell-lint.yml?branch=develop&label=Installer&style=for-the-badge&logo=gnubash&logoColor=white)](https://github.com/mythicalltd/featherpanel/actions/workflows/shell-lint.yml)
[![Developer Docs](https://img.shields.io/github/actions/workflow/status/mythicalltd/featherpanel/docs-pages.yml?branch=develop&label=Developer%20Docs&style=for-the-badge&logo=readthedocs&logoColor=white)](https://github.com/mythicalltd/featherpanel/actions/workflows/docs-pages.yml)

<br />

[![License](https://img.shields.io/github/license/mythicalltd/featherpanel?style=for-the-badge&color=2563eb)](https://github.com/mythicalltd/featherpanel/blob/develop/LICENSE)
[![Release](https://img.shields.io/github/v/release/mythicalltd/featherpanel?style=for-the-badge&color=f97316)](https://github.com/mythicalltd/featherpanel/releases)
[![Stars](https://img.shields.io/github/stars/mythicalltd/featherpanel?style=for-the-badge&color=eab308)](https://github.com/mythicalltd/featherpanel/stargazers)
[![Issues](https://img.shields.io/github/issues/mythicalltd/featherpanel?style=for-the-badge&color=ef4444)](https://github.com/mythicalltd/featherpanel/issues)
[![Discord](https://img.shields.io/discord/1399372922480492608?style=for-the-badge&logo=discord&logoColor=white&label=Discord&color=5865F2)](https://discord.mythical.systems)
[![Last Commit](https://img.shields.io/github/last-commit/mythicalltd/featherpanel/develop?style=for-the-badge&color=a855f7)](https://github.com/mythicalltd/featherpanel/commits/develop)

</div>

---

## ⚠️ Development branch

<table>
<tr>
<td width="56">🚨</td>
<td>

**Do not run `develop` in production.**

This branch ships experimental features that may be unstable, incomplete, or unsafe. For live environments, install a [stable release](https://github.com/mythicalltd/featherpanel/releases) and follow the [official docs](https://docs.mythical.systems/docs).

</td>
</tr>
</table>

---

## 🧭 Quick navigation

<table>
<tr>
<th align="left">📖 Documentation</th>
<th align="left">🧩 Developer reference</th>
<th align="left">💬 Community</th>
</tr>
<tr>
<td valign="top">

- [Installation guides](https://docs.mythical.systems/docs)
- [Configuration](https://docs.mythical.systems/docs)
- [Releases](https://github.com/mythicalltd/featherpanel/releases)

</td>
<td valign="top">

- [icanhasfeatherpanel](https://mythicalltd.github.io/FeatherPanel/icanhasfeatherpanel/) widgets, permissions, events
- [OpenAPI / Redoc](https://mythicalltd.github.io/FeatherPanel/icanhasfeatherpanel/api/) full API reference

</td>
<td valign="top">

- [Discord](https://discord.mythical.systems)
- [GitHub Issues](https://github.com/mythicalltd/featherpanel/issues)
- [Contributors graph](https://github.com/mythicalltd/featherpanel/graphs/contributors)

</td>
</tr>
</table>

---

## 🏗️ Stack

<table>
<tr>
<th>Layer</th>
<th>Technology</th>
<th>Path</th>
</tr>
<tr>
<td>🐘 Panel API</td>
<td>PHP 8.5</td>
<td><code>backend/</code></td>
</tr>
<tr>
<td>⚛️ Web UI</td>
<td>Next.js · React · TypeScript</td>
<td><code>frontendv2/</code></td>
</tr>
<tr>
<td>🦀 Async jobs</td>
<td>Rust (<code>async-runner</code>)</td>
<td><code>runner/</code></td>
</tr>
<tr>
<td>📦 Installer</td>
<td>Bash</td>
<td><code>installer/</code></td>
</tr>
</table>

Docker images for the backend, frontend, and async runner are published through the release workflows listed below.

---

## 📚 icanhasfeatherpanel public developer docs

**icanhasfeatherpanel** is FeatherPanel’s static developer reference. No running panel is required to browse it.

<details open>
<summary><strong>What’s included</strong></summary>

<br />

| Section | Contents |
| --- | --- |
| 🧩 **Widgets** | Injection points and widget slugs for plugin UI |
| 🔐 **Permissions** | Every permission node from `permission_nodes.fpperm` |
| 📡 **Events** | Plugin hooks and event payloads |
| 🔌 **API reference** | Redoc UI backed by the generated OpenAPI spec |
| 🔑 **OAuth2 playground** | OAuth2 docs (live API calls still need a panel) |

</details>

<details>
<summary><strong>🌐 Live site (GitHub Pages)</strong></summary>

<br />

**https://mythicalltd.github.io/FeatherPanel/icanhasfeatherpanel/**

</details>

<details>

<summary><strong>🛠️ Build locally</strong></summary>

<br />

```bash
# 1. Generate OpenAPI from PHP controller annotations
cd backend
COMPOSER_ALLOW_SUPERUSER=1 composer openapi

# 2. Export widgets / permissions / events + assemble static site
cd ../frontendv2
pnpm install
pnpm build:public-docs

# Output lands in ../docs-site/
# Serve it with any static file server, e.g.:
python3 -m http.server 8080 --directory ../docs-site
```

Optional environment variables for `build:public-docs`:

| Variable | Purpose |
| --- | --- |
| `DOCS_OUTPUT_DIR` | Output directory (default: `docs-site/`) |
| `DOCS_BASE_PATH` | URL prefix for GitHub Pages project sites (CI sets `/FeatherPanel` from the repo name) |
| `OPENAPI_JSON` | Path to the generated OpenAPI file |

</details>

---

## 🔄 CI & workflows

<table>
<tr>
<th>Workflow</th>
<th>Purpose</th>
</tr>
<tr>
<td><a href="workflows/frontend.yml">frontend.yml</a></td>
<td>Builds the Next.js panel UI</td>
</tr>
<tr>
<td><a href="workflows/backend.yml">backend.yml</a></td>
<td>PHP lint, migrations, and backend tests</td>
</tr>
<tr>
<td><a href="workflows/runner.yml">runner.yml</a></td>
<td>Builds and tests the Rust async runner</td>
</tr>
<tr>
<td><a href="workflows/shell-lint.yml">shell-lint.yml</a></td>
<td>ShellCheck + syntax validation for the installer</td>
</tr>
<tr>
<td><a href="workflows/docs-pages.yml">docs-pages.yml</a></td>
<td>Builds icanhasfeatherpanel + OpenAPI and deploys to GitHub Pages</td>
</tr>
<tr>
<td><a href="workflows/docker-dev.yml">docker-dev.yml</a></td>
<td>Dev Docker images → GHCR (<code>develop</code>)</td>
</tr>
<tr>
<td><a href="workflows/docker-release.yml">docker-release.yml</a></td>
<td>Release Docker images on version tags</td>
</tr>
<tr>
<td><a href="workflows/docker-oci-release.yml">docker-oci-release.yml</a></td>
<td>OCI release artifacts</td>
</tr>
<tr>
<td><a href="workflows/codeql.yml">codeql.yml</a></td>
<td>Security analysis (JS/TS)</td>
</tr>
<tr>
<td><a href="workflows/dependency-review.yml">dependency-review.yml</a></td>
<td>Flags vulnerable dependency changes in PRs</td>
</tr>
</table>

---

## 📊 Code statistics

<!-- COUNT-STATS:START -->

_Last updated: 2026-09-02T00:49:50.983Z_

| Extension | Files | Lines |
| --- | ---: | ---: |
| `.php` | 670 | 172,754 |
| `.tsx` | 527 | 159,132 |
| `.ts` | 143 | 18,222 |
| `.json` | 12 | 14,340 |
| `.yaml` | 3 | 6,436 |
| `.rs` | 16 | 3,529 |
| `.sql` | 203 | 3,165 |
| `.yml` | 20 | 2,092 |
| `.css` | 5 | 554 |
| **Total** | 1,599 | 380,224 |

<!-- COUNT-STATS:END -->

---

## 🚀 Try it (stable installer)

These commands install the latest **stable** build ideal for evaluation, not for running `develop` in production.

<table>
<tr>
<th align="left">🐧 Linux</th>
<th align="left">🪟 Windows</th>
</tr>
<tr>
<td valign="top">

```bash
curl -sSL https://get.featherpanel.com/stable.sh | bash
```

</td>
<td valign="top">

**PowerShell**

```powershell
iwr https://get.featherpanel.com/stable.ps1 | iex
```

**CMD**

```cmd
powershell -ExecutionPolicy Bypass -Command "iwr https://get.featherpanel.com/stable.ps1 | iex"
```

</td>
</tr>
</table>

<details>
<summary><strong>After installation</strong></summary>

<br />

1. Register the first account it becomes the admin automatically.
2. Follow the [configuration docs](https://docs.mythical.systems/docs).
3. Report bugs on [GitHub Issues](https://github.com/mythicalltd/featherpanel/issues).

</details>

---

## 🤝 Contributing

Contributions are welcome. Please read the [contributing guide](CONTRIBUTING.md) and [code of conduct](CODE_OF_CONDUCT.md) before opening a pull request.

<div align="center">

[![Contributors](https://contrib.rocks/image?repo=mythicalltd/featherpanel)](https://github.com/mythicalltd/featherpanel/graphs/contributors)

</div>

---

## 📄 License

FeatherPanel is licensed under the **[GNU Affero General Public License v3.0](../LICENSE)**.

---

<div align="center">

<sub>Made with ❤️ by <a href="https://mythical.systems"><strong>Mythical Systems</strong></a></sub>

<br /><br />

<a href="https://docs.mythical.systems/docs">Documentation</a>
&nbsp;·&nbsp;
<a href="https://mythicalltd.github.io/FeatherPanel/icanhasfeatherpanel/">Developer docs</a>
&nbsp;·&nbsp;
<a href="https://discord.mythical.systems">Discord</a>
&nbsp;·&nbsp;
<a href="https://github.com/mythicalltd/featherpanel/issues">Issues</a>
&nbsp;·&nbsp;
<a href="https://github.com/mythicalltd/featherpanel/releases">Releases</a>

</div>
