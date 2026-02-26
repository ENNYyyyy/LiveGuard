# CLAUDE.md

## Project Overview
This repository contains three apps:

1. `emergency-alert-backend` (Django + DRF API)
2. `LiveGuard` (React Native / Expo civilian app)
3. `agency-web` (React + Vite agency dashboard)

Use this file as the operational guide when working in this repo.

## Ground Rules
1. Verify first before editing code.
2. Do not push unless explicitly requested.
3. Never commit secrets (`.env`, Firebase service account, tokens, keys).
4. Preserve existing user changes; avoid destructive git commands.

## Directory Map
- Backend: `emergency-alert-backend`
- Civilian mobile app: `LiveGuard`
- Agency web app: `agency-web`
- Team docs:
  - `TEAM_ONBOARDING_CHECKLIST.md`
  - `PHASE2_WEB_PLAN.md`

## Backend Quick Start
```powershell
cd emergency-alert-backend
py -3.13 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py seed_data
python manage.py runserver 0.0.0.0:8000
```

## Backend Validation
```powershell
cd emergency-alert-backend
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py test --settings=alert_system.test_settings -v 1
```

## Mobile App Quick Start (LiveGuard)
```powershell
cd LiveGuard
npm install
Copy-Item .env.example .env
npx expo start -c
```

Set `EXPO_PUBLIC_API_BASE_URL` in `LiveGuard/.env`:
- Android emulator: `http://10.0.2.2:8000`
- Same machine: `http://127.0.0.1:8000`
- Physical device: `http://<your-pc-ip>:8000`

## Agency Web Quick Start
```powershell
cd agency-web
npm install
Copy-Item .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` in `agency-web/.env`:
- Local backend: `http://127.0.0.1:8000`

## Agency Auth Contract (Current)
`POST /api/auth/login/` payload for agency web:
```json
{
  "email": "officer@agency.com",
  "password": "******",
  "client_type": "AGENCY"
}
```

`/api/auth/profile/` and auth user payload include:
- `role`
- `is_agency_user`
- `agency_id`
- `agency_name`
- `agency_role`

## Common Troubleshooting
1. `manage.py` not found: run commands inside `emergency-alert-backend`.
2. `No module named 'django'`: use `.\venv\Scripts\python.exe` or activate venv.
3. Expo Go push warning: expected on SDK 53+; use a dev build for full remote push.
4. PowerShell env var syntax:
   - Use `$env:VITE_API_BASE_URL="http://127.0.0.1:8000"` (not `VITE_API_BASE_URL=...`).

## Done Criteria for Changes
1. Backend checks/tests pass.
2. `agency-web` builds (`npm run build`).
3. `LiveGuard` passes health checks (`npx expo-doctor`).
4. Manual flow validated for the changed feature.
