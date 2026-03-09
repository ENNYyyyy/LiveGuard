
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a multi-app emergency response system ("ERM / LiveGuard") with four sub-projects:

| Directory | Stack | Purpose |
|---|---|---|
| `emergency-alert-backend/` | Django 6 + DRF + MySQL | REST API for all clients |
| `LiveGuard/` | React Native + Expo | Civilian mobile app |
| `agency-web/` | React 19 + Vite | Agency dispatcher dashboard |
| `admin-web/` | React 19 + Vite | System-administrator panel |

---

## Backend (`emergency-alert-backend/`)

### Running the dev server
```bash
cd emergency-alert-backend
source venv/Scripts/activate   # Windows: venv\Scripts\activate
python manage.py runserver
```

### Running tests
Tests use SQLite via a dedicated settings module so no MySQL connection is needed:
```bash
python manage.py test --settings=alert_system.test_settings
# Run a single app:
python manage.py test alerts --settings=alert_system.test_settings
# Run a single test class or method:
python manage.py test alerts.tests.AlertCreateTests.test_create_alert --settings=alert_system.test_settings
```

### Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Environment variables (`.env` via python-decouple)
Required: `SECRET_KEY`, `DEBUG`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`
Optional: `ALLOWED_HOSTS`, `CORS_ALLOW_ALL_ORIGINS`, `CORS_ALLOWED_ORIGINS`, `ALERT_CREATION_THROTTLE`, `ALERT_DISPATCH_ASYNC`, `SECURE_HSTS_SECONDS`, `SECURE_SSL_REDIRECT`

### Django app structure
- **`accounts`** — custom `User` model (email-based, no username); push token stored here
- **`alerts`** — `EmergencyAlert`, `Location` (1-to-1 with alert), `AlertAssignment`, `Acknowledgment`
- **`agencies`** — `SecurityAgency`, `AgencyUser` (links a `User` to an agency with a role)
- **`notifications`** — `NotificationLog` (audit trail per assignment; channels: PUSH/SMS/EMAIL)
- **`admin_panel`** — admin-only views for dashboard, agency/user/alert CRUD, reports, settings
- **`alert_system`** — Django project package: settings, root URLs, permissions, WSGI/ASGI

### API URL prefixes
| Prefix | App |
|---|---|
| `/api/auth/` | accounts |
| `/api/alerts/` | alerts (civilian) |
| `/api/agency/` | agencies (agency staff) |
| `/api/admin/` | admin_panel |

### Authentication & permissions
- All endpoints use JWT (SimpleJWT). Access tokens expire in 60 min; refresh tokens in 7 days with rotation.
- Three custom permission classes live in `alert_system/permissions.py`:
  - `IsAgencyUser` — user must have an `agency_profile` relation (`AgencyUser`)
  - `IsAdminUser` — user must have `is_staff=True` OR a `systemadmin` relation
- Civilian endpoints only require `IsAuthenticated`.
- Alert creation is throttled via `AlertCreationThrottle` (scope: `alert_creation`).
- **Never import DRF's built-in `IsAdminUser`** in this project; always use the custom one from `alert_system.permissions` — the built-in only checks `is_staff` and would break `SystemAdmin`-profile users.

### Notification dispatch
- After alert creation, agencies are notified via Firebase (FCM), Web Push (pywebpush), SMS (Twilio), and/or email.
- `ALERT_DISPATCH_ASYNC=True` (default) fires notifications in a background thread so the create endpoint returns immediately.
- Set `ALERT_DISPATCH_ASYNC=False` in tests (already done in `test_settings.py`) to keep tests deterministic.

### Alert lifecycle
`PENDING` → `DISPATCHED` → `ACKNOWLEDGED` → `RESPONDING` → `RESOLVED` / `CANCELLED`
Priority levels: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` (set by a priority-questions flow before creation).

---

## Agency Web Dashboard (`agency-web/`)

### Commands
```bash
cd agency-web
npm install
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```

### Architecture
- Single-page app; routing via React Router v7.
- `src/App.jsx` — router root: `/login` → `LoginPage`, `/dashboard` → `DashboardPage` (wrapped in `ProtectedRoute`)
- `src/context/AuthContext.jsx` — login calls `/api/auth/login/` with `client_type: AGENCY`; stores JWT in localStorage via `src/storage.js`
- `src/api/client.js` — axios instance with base URL from `src/config.js`; `src/api/agency.js` contains all agency API calls
- `src/pages/DashboardPage.jsx` — 3-column layout: Incoming Queue | Map | Command Console. Assignments auto-poll every 30 s via `setInterval`. Uses `useNow()` hook (ticks every 1 s) for live elapsed timers on queue cards. Map is an OpenStreetMap iframe with an inverted CSS filter for dark appearance.
- No router-level shell/nav wrapper — `DashboardPage` owns its own layout.
- `src/styles.css` — single stylesheet, dark theme, CSS variables (`--bg-base: #111113`, `--accent: #e85c2c`)

---

## Admin Web Panel (`admin-web/`)

### Commands
```bash
cd admin-web
npm install
npm run dev
npm run build
```

### Architecture
- Same stack as `agency-web` (React 19, Vite, React Router v7, axios).
- `src/components/ShellLayout.jsx` wraps all authenticated pages with a sidebar + topbar.
- Routes: `/login`, `/dashboard`, `/agencies`, `/agencies/:id`, `/agencies/new`, `/alerts`, `/alerts/:id`, `/users`, `/notifications`, `/reports`, `/settings`
- `src/api/admin.js` — all admin API functions (`fetchDashboard`, `fetchAgencies`, `fetchAlerts`, `fetchUsers`, etc.)
- Auth requires Django staff or `SystemAdmin`-profile accounts.
- Same CSS design tokens as `agency-web`.

---

## Mobile App (`LiveGuard/`)

### Commands
```bash
cd LiveGuard
npm install
npx expo start           # Start Expo dev server
npx expo start --android
npx expo start --ios
```

### Architecture
- React Native with Expo SDK 54; state managed by Redux Toolkit (`src/store/store.js`).
- Slices: `authSlice` (JWT + user profile), `alertSlice` (active alert state), `locationSlice` (device GPS).
- Navigation: React Navigation v7 with native stack + bottom tabs + drawer (`src/navigation/AppNavigator.js`).
- API: axios instance in `src/api/axiosConfig.js`; base URL from `src/utils/config.js`.
- Key screens: `HomeScreen` → `EmergencyAlertScreen` (priority questions) → `LocationPickerScreen` → alert submission → `AlertStatusScreen` (polls status).
- Push notifications handled by `expo-notifications` + `src/services/notificationService.js`.
- Location acquired by `expo-location` + `src/services/locationService.js`.

---

## Standing Rules

1. Only modify files explicitly named or described in the request.
2. Never remove or change UI/interface elements that were not mentioned.
3. Ask when scope is unclear — do not assume.
4. Fix exactly what is asked, nothing more, nothing less.

## Confirmation Rule (Before Any Implementation)

Before making edits or running implementation commands, always do a confirmation step first:

1. Restate the request in clear, simple terms.
2. Briefly explain the planned approach and which files/components will be touched.
3. Call out assumptions, risks, or possible side effects.
4. Ask for explicit confirmation (e.g., "Proceed?").
5. Only proceed after the user confirms.

**Exceptions:** Skip confirmation only for read-only inspection tasks explicitly marked "no changes", or if the user says "proceed directly" / "no need to confirm" for that specific request.
