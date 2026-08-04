# ERM New Teammate Quickstart

Use this when someone pulls the repo and needs everything running quickly.

## 1) Prerequisites (install once)
- Git
- Python 3.13
- Node.js 20 LTS (npm included)
- MySQL 8+
- Expo Go (only if testing mobile on a phone)

## 2) Clone
```powershell
git clone https://github.com/ENNYyyyy/LiveGuard.git
cd LiveGuard
git pull origin master
```

## 3) One-command dependency setup
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup_new_teammate.ps1
```

Optional flags:
```powershell
# Skip backend dependency setup
powershell -ExecutionPolicy Bypass -File .\scripts\setup_new_teammate.ps1 -SkipBackend

# Skip mobile app setup
powershell -ExecutionPolicy Bypass -File .\scripts\setup_new_teammate.ps1 -SkipLiveGuard

# Skip agency/admin web setup
powershell -ExecutionPolicy Bypass -File .\scripts\setup_new_teammate.ps1 -SkipWeb
```

## 4) Required manual config
1. Fill env files:
- `emergency-alert-backend/.env`
- `LiveGuard/.env`
- `agency-web/.env`
- `admin-web/.env`

2. Add Firebase credentials file:
- `emergency-alert-backend/firebase-service-account.json`

3. Ensure MySQL is running and the DB in `.env` exists.

## 5) Backend init + run
```powershell
cd emergency-alert-backend
.\venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py seed_data
python manage.py runserver 0.0.0.0:8000
```

## 6) Run clients
```powershell
# Mobile app
cd LiveGuard
npx expo start -c
```

```powershell
# Agency web
cd agency-web
npm run dev
```

```powershell
# Admin web
cd admin-web
npm run dev
```

## 7) Verification checks
```powershell
cd emergency-alert-backend
.\venv\Scripts\Activate.ps1
python manage.py check
python manage.py test --settings=alert_system.test_settings -v 1
```

```powershell
cd agency-web
npm run build
```

```powershell
cd admin-web
npm run build
```

## Is this everything?
For local development: yes, this is the full checklist.

For full production-like behavior, they still need valid external credentials/services:
- Twilio (SMS)
- SMTP email credentials
- Firebase credentials
- Correct base URLs for each client environment
