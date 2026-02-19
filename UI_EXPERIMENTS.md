# UI Experiments (No API Impact)

This project now supports auth UI variants for safe frontend experiments.

## Current File Split

- UI One (current modern UI):
  - `src/features/auth/components/variants/ui-one/LoginUiOne.tsx`
  - `src/features/auth/components/variants/ui-one/RegisterUiOne.tsx`
- Entry wrappers (used by router/import compatibility):
  - `src/features/auth/components/Login.tsx`
  - `src/features/auth/components/Register.tsx`

## Available Variants

- `modern` (default): current production-style auth UI
- `classic`: alternative auth UI for testing

## How to Switch

1. Query parameter:
   - `http://localhost:3000/?ui=classic`
   - `http://localhost:3000/?ui=modern`
2. Local dev switcher:
   - Bottom-right switcher appears in dev mode (`npm run dev`)
3. Environment default:
   - Set `VITE_AUTH_UI_VARIANT=classic` or `modern`
   - Optional: `VITE_ENABLE_UI_EXPERIMENTS=true` to show switcher outside dev

## API Safety

- Login/Register API routes stay unchanged (`/api/login`, `/api/register`).
- Auth/session logic still uses existing `AuthContext` + backend contract.
- Only layout and visual shell are changed per variant.
