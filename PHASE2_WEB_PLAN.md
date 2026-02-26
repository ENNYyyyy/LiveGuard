# Phase 2 Plan (Agency Web Interface)

## Scope Decision
- Civilian experience stays in the existing React Native app (`LiveGuard`).
- Agency side moves to a web interface (not mobile).
- No role-selection screen in mobile login flow.

## Goal
Deliver a web dashboard for agency users that consumes existing backend APIs in `emergency-alert-backend`.

## Track A: Backend Contract Readiness (No Endpoint Redesign)
1. Confirm role identity from profile/login payload for routing in web app.
2. Confirm permission behavior for:
   - `IsAgencyUser` routes (`/api/agency/*`)
3. Confirm error response shape consistency (`error`, `detail`, field errors).
4. Confirm CORS and auth settings support local web frontend origin.

## Track B: Agency Web Interface
1. Authentication page (agency users).
2. Assignments list page:
   - source: `GET /api/agency/alerts/`
   - filters: status, recency.
3. Assignment detail page:
   - show alert metadata + live location info.
   - source: `GET /api/agency/alerts/{assignment_id}/location/`
4. Acknowledge workflow:
   - source: `POST /api/agency/alerts/{assignment_id}/acknowledge/`
   - form: acknowledged_by, ETA, response message, responder contact.
5. Status update workflow:
   - source: `PUT /api/agency/alerts/{assignment_id}/status/`
   - statuses: `RESPONDING`, `RESOLVED`.
6. Agency push token registration UI/helper:
   - source: `POST /api/agency/register-device/`
   - optional if browser push is deferred.

## Track C: Shared Web Concerns
1. JWT auth handling with refresh (`/api/auth/token/refresh/`).
2. Route guards by role/permission.
3. Centralized API client + consistent error parsing.
4. Polling strategy for active incidents where needed.
5. Basic accessibility and responsive layout.

## Suggested Delivery Order
1. Agency web MVP (auth + assignment list + acknowledge + status update).
2. Agency live location + status lifecycle refinements.
3. Hardening (error handling, logging UX, test pass, docs).

## Acceptance Criteria
1. Agency user can log in on web and process assignment end-to-end.
2. Agency user can acknowledge and update status from web.
3. No backend endpoint changes required to support agency web MVP.
