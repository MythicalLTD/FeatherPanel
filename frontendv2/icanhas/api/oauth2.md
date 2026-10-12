# OAuth2 API consent

Issues a user API key (`fp_…`) after the user approves a third-party app. This is **not** login OIDC.

Requires API key creation to be allowed (`user_allow_api_keys_create`, or admin).

| Flow                            | URL                                    |
| ------------------------------- | -------------------------------------- |
| Browser / server callback       | `/dashboard/account/oauth2/api/new?…`  |
| Device (CLI / TV / no redirect) | `/dashboard/account/oauth2/api/device` |

Playground: [oauth2-playground.html](./oauth2-playground.html) · OpenAPI tag `User - API Clients`.

## Pick a flow

| You have…                                          | Use                                                |
| -------------------------------------------------- | -------------------------------------------------- |
| A redirect URL (web or custom scheme)              | Callback, `mode=user` or `mode=server`             |
| No redirect URL                                    | Device                                             |
| Accidentally set `mode=device` on the callback URL | Error `USE_DEVICE_ENDPOINT` — use device endpoints |

---

## Callback

### Consent URL

```
{APP_URL}/dashboard/account/oauth2/api/new?name=…&callbackurl=…&mode=user
```

| Param                                 | Required | Notes                                                    |
| ------------------------------------- | -------- | -------------------------------------------------------- |
| `name`                                | yes      | Key name on approve                                      |
| `callbackurl`                         | yes      | Absolute `https://`, localhost `http://`, or `myapp://…` |
| `mode`                                | no       | `user` (default) or `server` — never `device` here       |
| `allowedips`                          | no       | IPv4/IPv6/CIDR allow-list                                |
| `alertCors`                           | no       | Notify on foreign-IP blocks (needs `allowedips`)         |
| `appName` / `appLogo` / `description` | no       | Consent UI                                               |

Optional preflight (session):

```http
GET /api/user/api-clients/oauth2/metadata?name=…&callbackurl=…&mode=user
```

Consent page then:

```http
GET  /api/user/api-clients/oauth2/authorize?…   → { request_token }
POST /api/user/api-clients/oauth2/authorize/approve
{ "request_token": "fpoauthreq_…" }
```

Deny: `POST …/authorize/deny` with the same body.

### Delivery

**`mode=user`** — redirect with fragment (browser-only; not sent to your server logs):

```
callbackurl#public_key=fp_…&private_key=fp_…&token_type=featherpanel_api_key&issued_at=…&authorization_code=fpoauthcode_…
```

**`mode=server`** — panel POSTs JSON to `callbackurl`; user stays on the panel success page.

Optional one-time exchange (public):

```http
POST /api/user/api-clients/oauth2/token
{ "code": "fpoauthcode_…" }
```

Prefixes: `fpoauthreq_`, `fpoauthcode_`. Codes are single-use.

---

## Device

For CLIs and anything that cannot host a redirect (RFC 8628-style).

### Start (public)

```http
POST /api/user/api-clients/oauth2/device
{ "name": "My CLI", "appName": "Feather CLI", "description": "…" }
```

Response includes `device_code` (secret, poll with this), `user_code` (`XXXX-XXXX`), `verification_uri`, `verification_uri_complete`, `expires_in` (900), `interval` (5).

User opens the verification URI, signs in, approves.

### Poll (public)

```http
POST /api/user/api-clients/oauth2/device/token
{ "device_code": "fpdev_…" }
```

| Result                                                    | Action                   |
| --------------------------------------------------------- | ------------------------ |
| `authorization_pending`                                   | Wait ≥ `interval`, retry |
| `slow_down`                                               | Increase interval        |
| `expired_token` / `access_denied` / `INVALID_DEVICE_CODE` | Stop                     |
| 200 + keys                                                | Store keys, stop         |

On the panel, claim + approve reuse the same authorize endpoints; credentials arrive via poll, not redirect.

```bash
curl -sS -X POST "$PANEL/api/user/api-clients/oauth2/device" \
  -H 'Content-Type: application/json' \
  -d '{"name":"ci-bot","appName":"CI"}'
# show user_code + verification_uri, then poll device/token every 5s
```

---

## Security

Approving grants full account API access for that key. Prefer `allowedips` for servers. Do not log `private_key` or `device_code`. Device `user_code` lasts 15 minutes.

## Related

- Settings: [../settings/guide.md](../settings/guide.md)
- Login SSO: [../auth/oidc-sso.md](../auth/oidc-sso.md)
- Passkeys: [../auth/passkeys.md](../auth/passkeys.md)
