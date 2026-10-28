# EduPass

EduPass is a college permission and campus pass portal. Students request time away from campus, assigned faculty review requests for their sections, selected categories can require a department head decision, and approved requests receive a time-limited QR pass that staff can verify.

## Features

- College ID and password login with hashed passwords, account lockout, JWT authentication, role authorization, profile editing, and password reset flow.
- Student permission submissions, required supporting document uploads, request history, cancellation while under review, and QR passes after approval.
- Faculty review limited to assigned sections; HOD review limited to the HOD department; admin visibility across requests.
- Dashboard counts, request categories, audit history, in-app notifications for review decisions, and QR verification logging.
- Responsive React portal for students and staff.

Accounts are provisioned by an administrator. Public signup is intentionally disabled because roles and academic placement must be assigned by the institution. Admins can create users, assign student/faculty/HOD scope, and activate or deactivate accounts in Manage people. Development accounts are provided through the optional seed script.

## Stack and structure

- Backend: JavaScript, Node.js, Express 4, MongoDB, Mongoose
- Frontend: React 18, JSX, React Router 6, Vite, standard CSS
- API: JSON REST API under `/api`

```text
backend/
  config/       database and application settings
  controllers/  auth, admin, and permission workflows
  models/       MongoDB schemas
  routes/       API endpoints
  middleware/   auth, error handling, and request validation
  utils/        shared services, helpers, and seed script
  test/         API and supporting-document regression tests
  app.js
  server.js
  package.json
  package-lock.json
  .env
  .env.example
```

The backend uses CommonJS with `app.js` for Express setup and `server.js` for database connection and process startup. The obsolete, unused legacy implementation is archived outside the application folder.

## Requirements

- Node.js 18 or newer and npm
- MongoDB Community Server or a MongoDB Atlas database

## Install and configure

From the project root:

```bash
npm --prefix backend install
npm --prefix frontend install
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (!(Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
```

Set values in `backend/.env`:

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (defaults to 5000) |
| `NODE_ENV` | `development`, `test`, or `production` |
| `MONGO_URI` | Local MongoDB URI or Atlas connection string |
| `JWT_SECRET` | Random secret of at least 32 characters |
| `JWT_EXPIRES_IN` | Token lifetime (defaults to `7d`) |
| `CLIENT_URL` | Allowed frontend origin(s), comma-separated |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Optional SMTP settings for password reset and enabled email notifications |
| `PRIVATE_UPLOAD_DIR` | Optional private file directory; defaults to `private-storage/` under the backend root |

`frontend/.env` accepts `VITE_API_URL`, defaulting to `http://localhost:5000/api`. Frontend variables are public; never put backend secrets there. Do not commit `.env` files.

For local MongoDB, start the MongoDB service and use `mongodb://127.0.0.1:27017/edupass`. For Atlas, create a database user and allow the API host in the Atlas network access list, then use the Atlas URI in `MONGO_URI`.

## Run locally

In two terminals from the project root:

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

Open the Vite URL, normally `http://localhost:5173`. The API health endpoint is `http://localhost:5000/api/health`.

Optional development data (this clears the configured database first):

```bash
npm --prefix backend run seed
```

Seed users all use password `Edupass@123`:

| Role | College ID |
| --- | --- |
| Admin | `ADMIN001` |
| HOD | `HODCSE`, `HODECE` |
| Faculty | `FAC101`, `FAC102`, `FAC103` |
| Student | `21CSE001` through `21CSE008` |

Never run the seed command against important or production data. The script refuses when `NODE_ENV=production`.

## API overview

All protected endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Login with college ID and password |
| GET | `/api/auth/me` | Current user and profile |
| POST | `/api/auth/logout` | Audit logout; client discards token |
| PUT | `/api/auth/profile` | Update name and phone |
| PUT | `/api/auth/change-password` | Change password |
| POST | `/api/auth/forgot-password` | Request a reset link |
| POST | `/api/auth/reset-password` | Set password using reset token |
| GET | `/api/dashboard` | Role-scoped counts and recent requests |
| GET | `/api/admin/lookups` | Admin-only department, year, and section options |
| GET | `/api/admin/users` | Admin-only directory with optional `q` and `role` filters |
| POST | `/api/admin/users` | Admin creates a user and assigns role/profile scope |
| PATCH | `/api/admin/users/:id/active` | Admin activates or deactivates a user |
| GET | `/api/categories` | Active permission categories |
| GET | `/api/permissions` | Role-scoped request list, optional `status`, `page`, `limit` |
| POST | `/api/permissions` | Student submits a request as multipart form data; optional `document` file (required for categories that request one) |
| GET | `/api/permissions/pending` | Requests awaiting the caller's review |
| GET | `/api/permissions/:id` | Request detail, attached documents, and approval history |
| GET | `/api/permissions/documents/:documentId` | Open an attachment when authorized for its request |
| POST | `/api/permissions/:id/review` | Assigned faculty approves or rejects |
| POST | `/api/permissions/:id/review-hod` | Department HOD approves or rejects |
| POST | `/api/permissions/:id/cancel` | Student cancels a request still under review |
| POST | `/api/permissions/verify-pass` | Staff verifies `{ "requestId", "token" }` |

The defined roles are `student`, `faculty`, `hod`, and `admin`. Faculty access is restricted to mapped sections; HOD access is restricted to their department; students see only their own requests.

## Build, tests, and deployment

```bash
npm --prefix backend test
npm --prefix backend start
npm --prefix frontend run build
```

Serve `frontend/dist` from a static host configured with SPA fallback to `index.html`. Run the API on a Node.js host and set its `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, and `NODE_ENV=production`. Configure `VITE_API_URL` at frontend build time to the deployed API origin plus `/api`. Use HTTPS in production.

The default test suite covers API smoke behavior and document signature/storage rules without MongoDB. An end-to-end integration suite runs when `EDUPASS_TEST_MONGO_URI` points to a disposable database whose name contains `_test`; it creates fixtures, tests upload/access/approval/rejection/cleanup, then drops that database. For example:

```powershell
$env:EDUPASS_TEST_MONGO_URI="mongodb://127.0.0.1:27017/edupass_documents_test"
$env:JWT_SECRET="integration-test-secret-at-least-32-characters"
npm --prefix backend test
```

## Known limitations

- Public self-registration is disabled by design; administrators provision accounts from the Manage people page.
- Password reset links are logged in development. Configure SMTP settings for password reset delivery in production.
- Request documents accept PDF, JPG, and PNG. The size limit comes from `AppSettings.maxFileSizeMB` (5 MB by default, bounded to 1–25 MB). Verified file bytes are stored under a private, non-public directory; MongoDB stores only their metadata and opaque storage keys. Production deployments must mount a persistent private volume or replace the storage service with private object storage.
- QR verification currently validates the approved time window and logs each attempt. A usage-once or gate check-in policy is not defined by the existing project and is not inferred here.
- The client accepts decoded QR JSON in the staff verification page; camera scanning is not built in.









