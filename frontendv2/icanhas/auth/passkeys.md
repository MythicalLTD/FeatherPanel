# Passkeys

WebAuthn login and account credentials (Touch ID, Windows Hello, security keys).

## Routes

| Method         | Path                                             | Auth             |
| -------------- | ------------------------------------------------ | ---------------- |
| GET            | `/api/user/auth/passkeys/status`                 | public/session   |
| POST           | `/api/user/auth/passkeys/authentication/options` | public           |
| POST           | `/api/user/auth/passkeys/authentication/verify`  | public → session |
| GET            | `/api/user/passkeys`                             | session          |
| POST           | `/api/user/passkeys/registration/options`        | session          |
| POST           | `/api/user/passkeys/registration/verify`         | session          |
| PATCH / DELETE | `/api/user/passkeys/{id}`                        | session          |

Implementation: `backend/app/routes/user/passkeys.php`, `App\Helpers\WebAuthnHelper`.

## Settings

Show on the login screen via `login_methods_order` / `login_hidden_methods` / `login_default_method` (id `passkey`). Category `auth_page` in [../settings/guide.md](../settings/guide.md).

RP ID comes from the panel URL — `app_url` must match the browser hostname (HTTPS). Mismatched domains break registration and assertion.

## Related

- OIDC login: [oidc-sso.md](./oidc-sso.md)
- API-key OAuth2: [../api/oauth2.md](../api/oauth2.md)
