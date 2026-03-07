# Developer Notes & Code Snippets

Use this file to store temporary code, ideas, or backup snippets.

## Login Page backup (Previous Version)

This version corresponds to "Login 2 UI" found in `src/components/pages/log in 1.js`.

```tsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sprout,
  CloudRain,
  Sun,
  Wind,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import loginBg from "@/assets/images/login_bg.png";

// ... [Truncated for brevity, full code available in history]
```

## To-Do List

- [x] Refactor Login Page to Sci-Fi theme
- [ ] Add backend integration for real authentication

## Useful Snippets

### Quick Toast

```tsx
toast.success("Message", { description: "Details" });
```
## Share Checklist (GitHub Pages + API)

Use this checklist before sharing the project link to other people.

### 1) Repository & Pages

- [ ] Set repository visibility to `Public`
- [ ] Run deploy: `npm run deploy`
- [ ] In GitHub `Settings > Pages`, set:
- [ ] Source: `Deploy from a branch`
- [ ] Branch: `gh-pages` / `(root)`
- [ ] Open and verify: `https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/`

### 2) Backend & Database

- [ ] Backend is running on a public URL (not localhost)
- [ ] `.env.production` has correct API URL:

```env
VITE_API_URL=https://your-backend-domain.com/api
```

- [ ] Database connection on backend is healthy
- [ ] API endpoints used by frontend return success in production

### 3) CORS & Auth

- [ ] Backend allows origin: `https://phsk04.github.io`
- [ ] Auth token flow works (login, protected API calls)
- [ ] Register/Login/Profile read/update works end-to-end

### 4) Final QA Before Sharing

- [ ] Open site from another browser/incognito
- [ ] Test login with demo account
- [ ] Test dashboard data loading
- [ ] Check browser console for errors
- [ ] Check Network tab: API must not call `localhost`

### 5) Share Package

- [ ] Share live URL
- [ ] Share repository URL
- [ ] Share demo account (if needed)
- [ ] Add short usage note (what works, what is demo-only)

## Long-Term Knowledge Note (Auto Deploy + API Safety)

This section is a detailed reference for maintaining this project as portfolio work.

### A) Does the website update automatically after code changes?

Now: Yes, if changes are pushed to `main`.

Why:
- We added GitHub Actions workflow at:
  - `.github/workflows/deploy-pages.yml`
- Trigger:
  - Every push to `main`
  - Manual run from GitHub Actions (`workflow_dispatch`)

Flow:
1. Push code to `main`
2. GitHub Actions runs install + build
3. Action deploys `dist/` to `gh-pages`
4. GitHub Pages serves latest version

Expected delay:
- usually 1-5 minutes after workflow success

### B) What must be configured in GitHub for production API?

Add repository secrets at:
- `Settings > Secrets and variables > Actions > New repository secret`

Recommended secrets:
- `VITE_API_URL` (required for real backend)
- `VITE_GOOGLE_CLIENT_ID` (optional)
- `VITE_FACEBOOK_APP_ID` (optional)
- `VITE_APPLE_CLIENT_ID` (optional)
- `VITE_APPLE_REDIRECT_URI` (optional)

Example:

```txt
VITE_API_URL = https://your-backend-domain.com/api
```

Important:
- Never use `localhost` in production secret values
- Frontend on GitHub Pages cannot access your local machine backend

### C) Will this break backend/database or mobile app API?

No direct impact on backend/database from Pages deploy.

Reason:
- GitHub Pages only hosts static frontend files
- Backend process (`server/server.js`) and DB stay separate
- API routes were not moved to GitHub Pages

What can fail:
- Wrong `VITE_API_URL`
- Missing CORS allowlist on backend
- Expired/invalid auth token

### D) Backend CORS minimum for this site

Allow at least:

```txt
https://phsk04.github.io
```

If CORS is blocked, app opens but API features fail (login/data load errors).

### E) How to verify after each release

1. Check workflow status: `Actions` tab should be green
2. Open live URL:
   - `https://phsk04.github.io/GreenCrop-NAT-IOT-WEB/`
3. Test login/register/profile update
4. Open browser DevTools > Network
5. Confirm API calls go to backend domain, not localhost

### F) Fast troubleshooting matrix

- Symptom: 404 on Pages
  - Check `Settings > Pages` uses `gh-pages / (root)`

- Symptom: Site not updating
  - Check latest workflow run result in `Actions`
  - Confirm commit was pushed to `main`

- Symptom: Login failed in production only
  - Check `VITE_API_URL` secret
  - Check backend CORS and auth middleware

- Symptom: Works locally but not online
  - Local uses proxy/localhost
  - Online must use public backend URL

### G) Use One Database for Local + GitHub Pages

Set both environments to the same backend API URL:

1. Local file `.env`

```env
VITE_API_URL=https://your-backend-domain.com/api
```

2. GitHub secret `VITE_API_URL` (same exact value)

Result:
- Local web and GitHub Pages call the same backend
- Both use the same database (no split data)

### H) Continuation Steps (from current setup)

Follow these in order to keep everything on one backend/database.

1. Local frontend `.env` (root project):

```env
VITE_API_URL=https://your-backend-domain.com/api
```

2. GitHub repo secret:
- Name: `VITE_API_URL`
- Value: same as local `.env` exactly

3. Backend env (`server/.env` in deployed backend):
- Ensure `CORS_ORIGINS` includes:
  - `http://localhost:3000`
  - `http://127.0.0.1:3000`
  - `https://phsk04.github.io`

4. Deploy/update frontend:
- Push to `main` (auto deploy workflow runs), or run manual deploy

5. Verification checklist:
- Local web login works
- GitHub Pages login works
- New user created from local can login on Pages (same DB proof)
- API calls in both places point to same backend domain

6. If login fails on Pages only:
- Check Actions workflow status
- Check `VITE_API_URL` secret value
- Check backend CORS allowlist

7. If login fails on both local and Pages:
- Check backend health endpoint
- Check backend DB credentials and service status
