# Events: Auth

18 events in this category.

### `featherpanel:auth:2fa:enabled`

- **Method:** `onAuth2FAEnabled`
- **Emitted:** yes
- **Callback docs:** array user info.
- **Data keys:** `user`

**Source files**

- `backend/app/Controllers/User/Auth/TwoFactorController.php`

### `featherpanel:auth:2fa:failed`

- **Method:** `onAuth2FAFailed`
- **Emitted:** yes
- **Callback docs:** array user info.
- **Data keys:** `ip_address`, `user`

**Source files**

- `backend/app/Controllers/User/Auth/TwoFactorController.php`

### `featherpanel:auth:2fa:setup`

- **Method:** `onAuth2FASetup`
- **Emitted:** yes
- **Callback docs:** array user info.
- **Data keys:** `user`

**Source files**

- `backend/app/Controllers/User/Auth/TwoFactorController.php`

### `featherpanel:auth:2fa:verified`

- **Method:** `onAuth2FAVerified`
- **Emitted:** yes
- **Callback docs:** array user info.
- **Data keys:** `user`

**Source files**

- `backend/app/Controllers/User/Auth/TwoFactorController.php`

### `featherpanel:auth:account:locked`

- **Method:** `onAuthAccountLocked`
- **Emitted:** yes
- **Callback docs:** array user info.
- **Data keys:** `already_locked`, `attempts`, `identifier`, `lockout_seconds`

**Source files**

- `backend/app/Helpers/AccountLockoutHelper.php`

### `featherpanel:auth:account:unlocked`

- **Method:** `onAuthAccountUnlocked`
- **Emitted:** yes
- **Callback docs:** array user info.
- **Data keys:** `identifier`

**Source files**

- `backend/app/Helpers/AccountLockoutHelper.php`

### `featherpanel:auth:email:changed`

- **Method:** `onAuthEmailChanged`
- **Emitted:** yes
- **Callback docs:** array user info, string email.
- **Data keys:** `ip_address`, `new_email`, `old_email`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/User/SessionController.php`

### `featherpanel:auth:email:login:code:requested`

- **Method:** `onAuthEmailLoginCodeRequested`
- **Emitted:** yes
- **Callback docs:** array user info, string ip_address.
- **Data keys:** `ip_address`, `user`

**Source files**

- `backend/app/Controllers/User/Auth/EmailLoginController.php`

### `featherpanel:auth:forgot:password`

- **Method:** `onAuthForgotPassword`
- **Emitted:** yes
- **Callback docs:** array user info, string reset_url, string reset_token.
- **Data keys:** `ip_address`, `reset_token`, `reset_url`, `user`

**Source files**

- `backend/app/Controllers/User/Auth/ForgotPasswordController.php`

### `featherpanel:auth:forgot:password:failed`

- **Method:** `onAuthForgotPasswordFailed`
- **Emitted:** yes
- **Callback docs:** string email, string reason.
- **Data keys:** `email`, `ip_address`, `reason`

**Source files**

- `backend/app/Controllers/User/Auth/ForgotPasswordController.php`

### `featherpanel:auth:login:failed`

- **Method:** `onAuthLoginFailed`
- **Emitted:** yes
- **Callback docs:** positional values from the emitted payload in key insertion order (see PluginEvents::emit).
     * Possible keys across emitters: email, error, ip_address, provider, reason, user, username, username_or_email.
- **Data keys:** `email`, `error`, `ip_address`, `provider`, `reason`, `user`, `username`, `username_or_email`

**Source files**

- `backend/app/Controllers/User/Auth/EmailLoginController.php`
- `backend/app/Controllers/User/Auth/LdapController.php`
- `backend/app/Controllers/User/Auth/LoginController.php`

### `featherpanel:auth:login:success`

- **Method:** `onAuthLoginSuccess`
- **Emitted:** yes
- **Callback docs:** array user info.
- **Data keys:** `user`

**Source files**

- `backend/app/Controllers/User/Auth/LoginController.php`
- `backend/app/Controllers/User/Auth/RegisterController.php`
- `backend/app/Controllers/User/Auth/TwoFactorController.php`

### `featherpanel:auth:logout`

- **Method:** `onAuthLogout`
- **Emitted:** yes
- **Callback docs:** array user info.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/Auth/AuthLogoutController.php`

### `featherpanel:auth:password:changed`

- **Method:** `onAuthPasswordChanged`
- **Emitted:** yes
- **Callback docs:** array user info.
- **Data keys:** `ip_address`, `user`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/User/SessionController.php`

### `featherpanel:auth:password:reset:failed`

- **Method:** `onAuthPasswordResetFailed`
- **Emitted:** yes
- **Callback docs:** string email, string reason.
- **Data keys:** `ip_address`, `reason`, `token`

**Source files**

- `backend/app/Controllers/User/Auth/ResetPasswordController.php`

### `featherpanel:auth:register:success`

- **Method:** `onAuthRegisterSuccess`
- **Emitted:** yes
- **Callback docs:** array user info.
- **Data keys:** `user`

**Source files**

- `backend/app/Controllers/User/Auth/RegisterController.php`

### `featherpanel:auth:registration:failed`

- **Method:** `onAuthRegistrationFailed`
- **Emitted:** yes
- **Callback docs:** string email, string reason.
- **Data keys:** `abuse_confidence_score`, `email`, `ip_address`, `reason`, `username`

**Source files**

- `backend/app/Controllers/User/Auth/RegisterController.php`

### `featherpanel:auth:reset:password:success`

- **Method:** `onAuthResetPasswordSuccess`
- **Emitted:** yes
- **Callback docs:** array user info.
- **Data keys:** `user`

**Source files**

- `backend/app/Controllers/User/Auth/ResetPasswordController.php`

