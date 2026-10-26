# Authentication and password recovery

The landing page supports login, registration, reset-link requests and new passwords. Authentication dialogs preserve and blur the existing background; the Dashboard layout is unchanged.

## Render setup

Configure these environment variables on the API service, never in GitHub Pages or any `VITE_*` variable:

- `RESEND_API_KEY`: a Resend API key with permission to send email.
- `RESEND_FROM_EMAIL`: a sender on a domain verified in Resend.
- `JWT_SECRET`: keep the API's existing strong production signing secret.
- `PASSWORD_RESET_URL`: `https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/`.

Deploy the source commit containing `server/services/password_reset.js` and its registration in `server/server.js`. The Nest wrapper also loads this Express application. Without deployment, the new endpoints return 404; without mail configuration, requests return 503. The frontend must not show a sent-email confirmation for either response.

The request endpoint is `POST /api/forgot-password` with `{ "email": "..." }`. Resend must accept the email and return an ID before a generic confirmation is returned. Account existence is not disclosed in the response: unknown addresses use the same delivery path and a non-redeemable token, avoiding an account lookup oracle when the email provider fails. Both requests are rate limited. No tokens or passwords are logged by the recovery module.

The reset endpoint is `POST /api/reset-password` with `{ "token": "...", "password": "..." }`. Links expire after 900 seconds. Tokens use a purpose-specific signing key, audience and password-hash fingerprint, and cannot act as session tokens. An atomic compare-and-update invalidates all prior links and permits only one concurrent reset to succeed. Tokens are carried in the URL fragment and removed from the address bar when the form loads.

## Verification

Run:

```sh
node --test scripts/tests/authentication.test.mjs server/services/password_reset.test.js scripts/tests/emergency-interlock.test.mjs
npm run build:gh
```

In the browser, test invalid credentials, required fields, mismatched passwords, both visibility controls, edit-to-clear feedback, recovery-unavailable feedback, and navigation back to login. At a 390px viewport, the form must scroll vertically, keep 60px input heights and avoid horizontal overflow.

Real inbox delivery requires configured Render variables and a deployed API. Unit tests use a mocked Resend transport and cannot establish real email delivery.

Before publishing, verify the remote main commit and confirm Dashboard files match the latest agreed version. Publish from the current source; never publish an older worktree's `dist` folder.
