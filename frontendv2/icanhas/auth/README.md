# Auth

Three different systems. Do not mix them up.

| Goal                                           | Guide                                |
| ---------------------------------------------- | ------------------------------------ |
| Log in with Authentik / Keycloak / Google OIDC | [oidc-sso.md](./oidc-sso.md)         |
| Log in with a passkey                          | [passkeys.md](./passkeys.md)         |
| Give a CLI or app an `fp_…` API key            | [../api/oauth2.md](../api/oauth2.md) |

OAuth2 for API keys is not login SSO. Device flow is for clients that cannot do a redirect; callback flow is for normal web apps.

Playground (needs a live panel): [../api/oauth2-playground.html](../api/oauth2-playground.html)
