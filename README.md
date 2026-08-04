# LiveGuard Emergency Response Platform

LiveGuard is a full-stack emergency alert and incident response system designed to connect civilians, emergency agencies, and administrators through a shared platform.

## Project structure

- `emergency-alert-backend/`: Django REST API for emergency alert intake, agency assignment, notification dispatch, and incident lifecycle management.
- `admin-web/`: React / Vite web dashboard for administrators to manage agencies, users, alerts, and system settings.
- `agency-web/`: React / Vite responder dashboard for security agencies to view and acknowledge assigned alerts.
- `LiveGuard/`: Expo React Native mobile app for civilians to submit emergency alerts, share location, and receive update notifications.

## Core functionality

- Emergency alert creation with incident type, description, and location.
- Risk assessment and priority scoring based on structured incident questionnaires.
- Proximity-aware agency assignment and prioritized dispatch.
- Multi-channel notification delivery: push notification, SMS, and email.
- Alert acknowledgment, response tracking, and incident resolution workflows.
- Admin and agency user roles with dedicated dashboard experiences.
- Logging of notification delivery and channel failures for audit and reliability.

## Technology stack

- Backend: Python 3.13, Django 6.0, Django REST Framework, MySQL
- Mobile app: Expo, React Native, Redux, Expo Notifications, Expo Location
- Admin and agency dashboards: React, Vite, Axios, React Router
- Notifications: Firebase push, Expo push, Twilio SMS, SMTP email

## Setup highlights

1. Copy environment templates and fill credentials:
   - `emergency-alert-backend/.env`
   - `LiveGuard/.env`
   - `agency-web/.env`
   - `admin-web/.env`
2. Add Firebase service account file:
   - `emergency-alert-backend/firebase-service-account.json`
3. Ensure MySQL is running and database values match `.env` files.
4. Run backend migrations and seed data:
   ```powershell
   cd emergency-alert-backend
   .\venv\Scripts\Activate.ps1
   python manage.py migrate
   python manage.py seed_data
   python manage.py runserver 0.0.0.0:8000
   ```
5. Start the mobile app:
   ```powershell
   cd LiveGuard
   npx expo start -c
   ```
6. Start the agency web app:
   ```powershell
   cd agency-web
   npm run dev
   ```
7. Start the admin web app:
   ```powershell
   cd admin-web
   npm run dev
   ```

## Additional documentation

- `SETUP_QUICKSTART.md` — quick local onboarding instructions.
- `TEAM_ONBOARDING_CHECKLIST.md` — detailed setup checklist for new teammates.

## Repository

- GitHub: https://github.com/eniola-as/LiveGuard

## Notes

- External services such as Twilio, SMTP email, and Firebase are required for full notification functionality.
- The repository is currently not deployed; this is a local development and staging-ready codebase.
- The repository includes a placeholder MIIT license statement in `MIIT_LICENSE.md`. The real ICP/MIIT registration number must be obtained through official filing.
