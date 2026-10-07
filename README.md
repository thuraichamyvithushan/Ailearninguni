# Ailearninguni

A modular AI learning platform built with React, Vite, Tailwind CSS, React Router, Axios, Framer Motion, Lucide, Express, and Firebase. The frontend uses Firebase Authentication; all application data, uploads, management operations, roles, and certificates go through the Express API and Firebase Admin SDK.

## Run locally

Use Node.js 22.14 or newer and npm. This project uses npm workspaces with separate frontend and backend dependency manifests. Install and run from the project root:

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. The API listens at **http://localhost:4000**. Local development defaults to an explicitly labeled demo mode until Firebase is configured. In Login, use **Student demo** or **Admin demo**. Sample accounts:

| Account    | Email                | Password       |
| ---------- | -------------------- | -------------- |
| Student    | student@aiatlas.demo | AtlasDemo2026! |
| Superadmin | admin@aiatlas.demo   | AtlasDemo2026! |

Demo records persist in the ignored `backend/.data/demo.json`; uploads live in `backend/uploads`. Demo passwords are hashed with bcrypt; sessions are signed, expire after eight hours, and are stored in sessionStorage. An ephemeral signing key invalidates sessions after an API restart. Set a random `DEMO_JWT_SECRET` in `backend/.env` to keep local sessions across restarts. Demo mode is rejected when `NODE_ENV=production`, and the demo server binds to loopback. Test data uses an isolated temporary directory.

The npm download cache was moved to `F:/Codex-AI-Atlas-npm-cache` during setup because C: was full; this is generated cache, not application data. Future installs can use `npm install --cache F:/Codex-AI-Atlas-npm-cache` if C: remains low on space.

## Included

- Homepage with admin-managed content, searchable course catalog, course details, admin-created learning-path catalog, illustrative pricing, about, contact, login, registration, and certificate verification.
- Student onboarding, dashboard, enrollment, course player, sequential lesson locks, completion requirements, text/video/image/PDF/resource/exercise/quiz/assignment lessons, projects, certificates, profile, support, and activity notifications.
- Prompt builder with role, task, context, constraints, and output format; copy, save, edit, and delete personal prompts.
- Admin dashboard and analytics; course, module, and lesson CRUD; visual builder with accessible move-up/down ordering; public previews; resource uploads; categories, learning-path templates, instructors, and packages.
- Multiple-choice, true/false, and multiple-select quizzes with scoring, pass thresholds, attempt limits, random order, and explanations. Answers stay on the server until grading.
- Student profiles, manual enrollment, account suspension, superadmin-only role changes, progress reset, project review, and certificate issuance.
- Instructor review workspace at `/instructor`, restricted to assigned course submissions.
- Real downloadable PDF certificates and public verification. Required lessons and quizzes must be completed and final projects approved where required. Resetting progress revokes certificates.
- Responsive public navigation and portal sidebars, mobile course outline, admin tables that become cards, loading/error/empty states, native accessible dialogs, form validation, toasts, and reduced-motion support.

The homepage displays saved categories, published courses, available learning paths, active packages, and instructor profiles. Empty sections are hidden; there are no hardcoded example stories or course pathways. Seeded catalog records are demonstration content; replace them with reviewed instructional content before opening enrollment. Learning hours estimate completed lesson duration, rather than measured time spent studying. Admins create learning paths and assign or remove them in Students → student profile → Assigned learning path. Onboarding only saves preferences and never assigns or changes a learning path. Individual catalog courses remain independently available.

## Connect Firebase

1. Create a Firebase project, enable Email/Password in Authentication, create Firestore and Storage, and authorize your web app domains.
2. Copy `frontend/.env.example` to `frontend/.env`. Set `VITE_AUTH_MODE=firebase` and all `VITE_FIREBASE_*` values from your Firebase web app configuration. These client identifiers are not Admin credentials. Set `VITE_API_URL` to your API base URL if hosting the frontend separately.
3. Copy `backend/.env.example` to `backend/.env`. Set `AUTH_MODE=firebase`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `CLIENT_ORIGIN`, and `PUBLIC_APP_URL`. Use application default credentials or `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service-account file outside this repository. Never commit the credential file or private key.
4. Install/use Firebase CLI as needed, select your project from the `backend` folder, and deploy the provided Firestore rules, indexes, and Storage rules using `backend/firebase.json`. The rules deny direct client data access; Express uses Admin SDK authorization and private uploads.
5. Run `npm run seed` to install demonstration catalog data. In Firebase mode this creates courses and paths, and does **not** create sample authentication accounts. Registration creates real Firebase Auth accounts and a server-owned student profile. Missing role claims default to student; the API initializes the student claim without allowing the client to select a role.
6. Register the intended administrator, find their Firebase Auth UID, and bootstrap the trusted role from the server environment:

```sh
npm run set-role -- FIREBASE_USER_UID superadmin
```

7. Sign in again to refresh claims. Only superadmins can change roles or modify administrator accounts. Instructor records assigned to real instructor users must use that user's UID as their record ID/course instructorId.
8. Restart development after changing environment files. For deployment, set `NODE_ENV=production` and Firebase mode on the backend. Configure HTTPS, allowed origins, and your reverse proxy. Do not place `OPENAI_API_KEY` or Admin credentials in any `VITE_*` variable.

Firebase Authentication, Firestore transactions, server timestamps, custom claims, and Storage code are implemented. Local configuration now points to the supplied Firebase project, and the Admin credential authenticated successfully. That project currently has no Firestore database; create the default database, deploy rules/indexes, and verify the cloud features before launch. The private service-account JSON is stored outside this project.

## Commands

```sh
npm run dev       # frontend and API together
npm run dev:frontend   # frontend only
npm run dev:backend   # API with restart on source changes
npm run build     # production frontend in frontend/dist/
npm run preview   # frontend build preview; start API separately
npm run start:backend # API without source watching
npm test          # isolated API integration tests
npm run seed      # seed catalog only in Firebase mode; demo fixtures locally
npm run set-role -- USER_UID superadmin # bootstrap a Firebase role
```

Production frontend builds default to Firebase mode. For a local demonstration of the production bundle, explicitly set `VITE_AUTH_MODE=demo` at build time and run the API in local development mode. For Vercel, use `frontend` as the project root with its provided `vercel.json`; host Express separately and configure `VITE_API_URL` plus `CLIENT_ORIGIN`.

## Structure

```text
frontend/
  src/
    components/{ui,common,course}/
    context/  hooks/  layouts/
    pages/{public,student,admin}/
    routes/  services/  styles/
    App.jsx  main.jsx
  public/                   # static assets
  .env.example  package.json  vite.config.js  vercel.json
backend/
  src/{config,controllers,middleware,routes,services,utils,validators}/
  src/{app,server}.js
  test/platform.test.js
  firebase/                 # Firestore rules, indexes, Storage rules
  .data/  uploads/          # ignored local runtime data
  .env.example  package.json  firebase.json
package.json                # workspace commands
package-lock.json           # shared dependency lockfile
```

Firestore uses the requested user, course, nested module/lesson, enrollment, progress, quiz, attempt, project, certificate, path, prompt, and activity collections, plus lookup, upload, exercise, visit, package, instructor, setting, and support collections. The persistence adapter supports indexed user-scoped queries and transactional mutations. Admin analytics currently aggregate collections; introduce pagination and precomputed aggregates as data volume grows. The local JSON adapter supports one process and is only for development.

## Security and current limits

Firebase ID tokens are verified with revocation checks. Server middleware enforces signed claims and suspension, independent of React route protection. Request schemas strip unknown fields; students cannot write roles, scores, progress, approval states, or certificates. Sensitive endpoints have rate limits; Express uses Helmet, bounded bodies, and configured CORS. Uploaded resources are private, limited by size/type/signature, and downloaded only through authorized APIs. Lesson text renders as safe React text with lightweight heading/list formatting.

Sequential learning is enforced by required predecessors. Video completion requires server elapsed time and distinct client playback seconds; it is a practical progress gate, not a tamper-proof media attestation system. For strict video certification, integrate a trusted media provider's playback events.

Payments, live group booking/coaching, email delivery, and AI response generation are not enabled. Paid-course enrollment in the preview does not collect money. Contact forms save requests for admin review. `POST /api/ai/generate` is an authenticated backend stub that returns 501. The structured prompt builder works without OpenAI. Notifications are derived from real learning activity, project feedback, and certificates; there is no email or push delivery. Final project approval does not automatically email a certificate; learners claim an eligible PDF in the course player.

The local environment is configured for Firebase. Production hosting has not been configured.
