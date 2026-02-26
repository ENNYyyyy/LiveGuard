# Team Onboarding Checklist

## 1) Clone and Pull
```powershell
git clone https://github.com/ENNYyyyy/LiveGuard.git
cd LiveGuard
git pull origin master
```

## 2) Backend Setup (`emergency-alert-backend`)
```powershell
cd emergency-alert-backend
py -3.13 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 3) Backend Environment
1. Copy `emergency-alert-backend/.env.example` to `emergency-alert-backend/.env`.
2. Fill real values for DB, Twilio, email, and Firebase path.
3. Place Firebase credentials file at:
   - `emergency-alert-backend/firebase-service-account.json`
4. Ensure MySQL is running and database exists.

## 4) Backend Run
```powershell
cd emergency-alert-backend
.\venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py seed_data
python manage.py runserver 0.0.0.0:8000
```

## 5) Frontend Setup (`LiveGuard`)
```powershell
cd LiveGuard
npm install
```

## 6) Frontend Environment
1. Copy `LiveGuard/.env.example` to `LiveGuard/.env`.
2. Set `EXPO_PUBLIC_API_BASE_URL` to reachable backend URL:
   - Android emulator: `http://10.0.2.2:8000`
   - Same machine (web/iOS sim): `http://127.0.0.1:8000`
   - Physical phone on same Wi-Fi: `http://<your-pc-ip>:8000`

## 7) Frontend Run
```powershell
cd LiveGuard
npx expo start -c
```

## 8) Verification
Backend:
```powershell
cd emergency-alert-backend
.\venv\Scripts\Activate.ps1
python manage.py check
python manage.py test --settings=alert_system.test_settings -v 1
```

Frontend:
```powershell
cd LiveGuard
npx expo-doctor
```

## 9) Known Notes
1. Expo Go does not support full remote push flow on SDK 53+.
2. Use a development build for full push notification behavior.
3. `.env`, Firebase credentials, and `venv` must not be committed.
