# Security fixes — FeatherPanel (branch `security-fixes-2026-10-14`)

Base commit: `0fa86b2` (upstream `develop`). 49 files changed, no new dependencies,
no database migrations, no configuration that has to be added by hand.

This branch closes the findings of a static audit (source review + Semgrep + manual
verification). Every item below was read back in the code and, where possible,
exercised with a test. Behaviour impact is stated so an operator knows what to expect.

## 1. Client IP trust (`CloudFlareRealIP.php`)

* `CF-Connecting-IP` was trusted from **any** sender as long as the value looked like an
  IP (`isFromCloudflare($remoteAddr) || isValidIP($cfIP)`), and any of
  `X-Forwarded-For`/`X-Real-IP`/`X-Client-IP` was trusted whenever it was *present*.
  A direct caller could therefore choose their own address — which feeds the API-key IP
  allowlist, the rate-limit counter key and every audit-log entry.
* Now headers are only honoured when the direct peer is Cloudflare (published ranges),
  loopback or a private address (`isTrustedProxyPeer()`). Installations behind a proxy on
  **another host** set `TRUST_PROXY_HEADERS=true` (same behaviour as before).

## 2. Rate limiting was inert (`RateLimitConfig.php`, `RateLimitMiddleware.php`, new helpers)

* `RateLimitConfig::isGloballyEnabled()` defaulted to `false` and `getRouteRateLimit()`
  returned `null` without a matching `storage/config/ratelimit.json` entry, so every
  `Rate::perMinute()` in the routes (login, register, forgot/reset password, 2FA, passkeys,
  webhooks, API clients) never reached Redis.
* Now: global default is on (an explicit `_enabled: false` still switches everything off),
  and the code default is enforced for the abuse-relevant namespaces
  (`user-auth`, `user-auth-verify-email`, `user-api-clients`, `public-webhooks`). Busy UI
  polling routes keep their previous opt-in behaviour on purpose, so a running installation
  does not start answering 429 on normal traffic.
* When Redis is unavailable the limiter no longer gives up: `FileRateLimiter` +
  `FileCounterStore` (`storage/caches/security-store`, one JSON file per identifier,
  `flock`, fixed window) keep counting. `AccountLockoutHelper` uses the same store, so a
  Redis outage neither locks everybody out nor opens password guessing (the 2FA reservation
  keeps identical threshold semantics).

## 3. Cloud link handshake (`routes/system/cloud.php`)

* `POST /api/cloud/v1/panel-handshake` writes the panel identity keys before any
  authentication (by design — the cloud calls it), and `oauth2/callback` then stores the
  access pair for a caller that presents exactly those self-chosen keys.
* Now both endpoints are rate limited (10/min, works without Redis), the first link is
  logged as a warning and its source IP is stored (`feathercloud_link_source_ip`). Setting
  the value `feathercloud_link_token` turns on a hard check: the caller must send
  `X-Panel-Link-Token` (or `?panel_link_token=`), otherwise 403. Default is empty =
  previous behaviour, because the vendor side has to send that token.

## 4. API clients (`Middleware/AuthMiddleware.php`)

* A bearer token was accepted when it matched either the `private_key` **or** the
  `public_key` of an API client (`getApiClientByPublicKey` fallback), which made the
  "public" half a login secret — and it is handed out in Calagopus redirect URLs.
* Now only the private key authenticates. Operators with legacy clients that send the
  public key can set the setting `api_clients_allow_public_key_auth=true` to restore the
  old behaviour. The redirect URL itself is unchanged (integration contract).

## 5. OIDC login (`Controllers/User/Auth/OidcController.php`, new `Helpers/OidcIdTokenVerifier.php`)

* The `id_token` was decoded without any signature verification
  (`decodeJwtWithoutVerification`) and the nonce from the state was never compared.
* Now the token is verified against the provider's JWKS (`jwks_uri` from discovery, cached,
  `kid` match) using `firebase/php-jwt` when present (it is an existing dependency) and
  `openssl_verify` otherwise (RS256/384/512, ES256), or HMAC with the client secret for
  HS*. `exp`/`iat`/`nbf` (60 s tolerance) and the state nonce are checked.
* Compatibility: providers without a usable JWKS keep working, but a clear
  `signature was NOT verified` warning is logged.

## 6. Password reset (`ForgotPasswordController.php`, `ResetPasswordController.php`, new `Helpers/PasswordResetTokenHelper.php`)

* The full reset token was written to the log and echoed in the error payload, and it was
  stored in `mail_verify` — the same column the login reads as the "e-mail verified" flag,
  so a reset marked an unverified address as verified.
* Now: only a 16-hex SHA-256 fingerprint is logged, the token is gone from the response,
  and reset tokens carry a prefix (`fpreset:v:` / `fpreset:u:`) that the verification flag
  evaluation ignores. After a successful reset an unverified address stays unverified
  (a `fpreset:used:<random>` marker keeps it unusable and unguessable). Legacy tokens
  without prefix still work.

## 7. Webspace subusers (`WebSpaceSubuserController.php`, `Chat/WebSpaceSubuser.php`)

* A subuser with `user.update`/`user.create` could set arbitrary permissions — including
  `*`, which `hasPermission()` treats as "everything" — for themselves and for others.
* Now permissions are clipped to the actor's own set (`clampAssignablePermissions`),
  editing one's own record returns 403 `CANNOT_MODIFY_SELF`, and `*` is only accepted for
  the owner/panel admin. Owners and admins are unrestricted (`assignablePermissions()`
  returns `null` for them) — verified against `WebSpaceGateway::hasPermission()` and
  `SubuserPermissionChecker`.

## 8. Missing permission checks

* `reinstall` (wipe + reinstall, `wipe_files` defaults to true) and `abortInstall` only
  checked access: any user with access, even a subuser with `file.read`, could delete every
  file of the WebSpace. Now `SETTINGS_UPDATE` is required.
* `unlockBackup` had no check at all while `lockBackup` required `BACKUP_READ`; now
  `BACKUP_DELETE` or `BACKUP_RESTORE` is required.
* `deleteShareJob` deleted by `publicId` without checking the WebSpace: a foreign share is
  now rejected with 404.

## 9. Cross-tenant writes (`TaskController.php`, `ServerScheduleController.php`)

* Raw request bodies went into `Task::updateTask()` / `ServerSchedule::updateSchedule()`;
  only unknown columns were rejected, so `schedule_id` / `server_id` allowed re-parenting
  another tenant's object. Now explicit field whitelists are used (empty body → 400).

## 10. Chatbot tools (`Services/Chatbot/Tools/*`)

* The file/database tools only called `ServerGateway::canUserAccessServer()`, which accepts
  any server subuser, so a subuser without `database.view_password` / `file.*` could read
  plaintext database passwords or read/write/delete server files through the assistant.
* Now the same `SubuserPermissionChecker` nodes as the REST controllers are enforced
  (`database.view_password`, `file.read-content`, `file.update`, `file.delete`).

## 11. Files, plugins and URL fetches

* `PluginsController::uninstall/export/resyncSymlinks` validated `$identifier` nowhere
  while `install()` did; `..` segments reached `rm -rf`, zip and path building. Now the same
  `^[a-zA-Z0-9_-]+$` rule applies (400 otherwise).
* `@file_get_contents($url)` (plugin install from URL, spell store) is replaced by
  `Helpers/SafeUrlFetcher`: http(s) only, no userinfo, host must resolve to public
  addresses (private/loopback/link-local/ULA/CGNAT rejected), 50 MiB limit, redirects
  followed manually and re-validated per hop.
* `AddonPackageHelper` validates archive entry names before extraction (no `..`, no
  absolute paths, no symlinks, max 20000 entries / 1 GiB) for both the ZipArchive and the
  unzip fallback.
* `UserDataExportService` applies the existing `isSafeArchivePath` check to the PharData
  branch as well.
* `PluginManagerController` public-asset upload got an extension allowlist (css/js/json/
  html/png/svg/...), `basename()` and a containment check against the addon's public folder.
* `ServerFilesController` no longer calls `file_exists()` on a user-supplied path (panel-side
  file-existence oracle); the path stays a log string.

## 12. Smaller hardening

* `GET /api/debug/ip` (echoes every header and server variable) is only registered when
  `APP_DEBUG === true`; no frontend code calls it.
* `POST /api/user/api-clients/validate` returns `valid: true/false` only — no more
  `username`/`email`/`uuid` of the owner.
* `SessionController::signApiKey` verifies that the API client belongs to the caller
  (previously a signing oracle for foreign keys).
* OAuth2 request tokens expire after 24 h (`OAUTH2_REQUEST_EXPIRES_IN`) and the expiry is
  checked on approve/deny; interactive consent is unaffected.
* `ServerMiddleware`'s 404 no longer embeds `user` and the Symfony request object (own
  headers/cookies in the response body).
* `$sortBy`/`$sortOrder` are validated against an explicit column allowlist in nine models
  (ApiClient, Server, User, Subuser, ServerSchedule, Task, UserSshKey, Image,
  DatabaseInstance) before they reach the `ORDER BY` clause.
* `ServerDatabaseController::runQuery()` fetches row by row and stops at 500 rows instead
  of materialising the whole result set; database usernames/passwords come from
  `random_int()` instead of `mt_rand()`.
* `.gitignore` covers `.env`/`.env.*` (`!.env.example`).

## Verification

* `php -l` in `php:8.3-cli` for all 48 changed/new PHP files: no syntax errors.
* Helper tests (`FileCounterStore`, `FileRateLimiter`, IP trust rules, OIDC verifier with
  real keys/JWKS, password-reset token handling): all green, details in
  `secfix-tests/run.php` of the audit workspace.
* The branch applies cleanly (`git apply --check --3way`) on a fresh clone of `0fa86b2`
  and produces the same 49 files.

## Intentionally not changed

* **Session/remember token**: the cookie value is the database value and a hash would force
  a rotation on login, logging every other device out. Needs a product decision.
* **First registration becomes admin**: the installer creates no panel user, so this is the
  only bootstrap. Cleaner fix: create the admin in the installer/CLI.
* **Hard cloud-link lock by default**: would break linking while the vendor side does not
  send the link token — hence opt-in.
* **`compress`/`decompress` still require `FILE_CREATE`**: there is no `FILE_ARCHIVE`
  permission node; switching would lock out existing subusers.
* The tracked demo `.env` stays (the dev stack needs it); only the ignore rule was added.
* The GitHub Actions shell-interpolation warnings in `.github/workflows/*` are untouched —
  they affect upstream CI only, not a running panel.
