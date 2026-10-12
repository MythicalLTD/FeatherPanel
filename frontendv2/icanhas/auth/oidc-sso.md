# OIDC login

Browser SSO into FeatherPanel. Not the same as [API-key OAuth2](../api/oauth2.md).

Providers are rows in the database (Admin → OIDC providers). Legacy single-provider settings still exist in config, but login loads providers by UUID.

## Setup

1. At the IdP, register redirect URI `{APP_URL}/api/user/auth/oidc/callback`.
2. Admin → OIDC providers → add issuer, client id/secret, scopes (default `openid email profile`).
3. Enable the provider. Confirm a button shows on `/auth/login`.
4. Optional: `oidc_disable_local_login` blocks password/passkey for non-admins (admins can still use local).

`app_url` must match the hostname users open.

## Endpoints

| Method | Path                                        | Notes                                       |
| ------ | ------------------------------------------- | ------------------------------------------- |
| GET    | `/api/system/oidc/providers`                | Public list `{uuid,name}` for login buttons |
| GET    | `/api/user/auth/oidc/login?provider={uuid}` | Starts redirect                             |
| GET    | `/api/user/auth/oidc/callback`              | Code exchange → session                     |
| GET    | `/api/user/auth/oidc/link?provider={uuid}`  | Link IdP while already signed in            |
| DELETE | `/api/user/auth/oidc/unlink`                | Unlink                                      |
| CRUD   | `/api/admin/oidc/providers[/{uuid}]`        | Admin                                       |

Login method order/hide settings: `login_methods_order`, `login_hidden_methods`, `login_default_method` (include or hide `oidc`). See [../settings/guide.md](../settings/guide.md).

Buttons appear when the public list returns at least one enabled provider — not only when `oidc_enabled` is set.

## Flow

Login page fetches providers → user clicks → panel discovers `{issuer}/.well-known/openid-configuration` → IdP authorize → callback → token + ID token → match or provision user → redirect into the app.

Useful provider flags: `auto_provision`, `require_email_verified`, optional `group_claim` / `group_value`.

## Related

- Passkeys: [passkeys.md](./passkeys.md)
- API keys for apps: [../api/oauth2.md](../api/oauth2.md)
