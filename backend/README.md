# AI Atlas API

Express 5 + Firebase Admin SDK. From this folder run `npm run dev`, `npm start`, `npm test`, or `npm run seed`. From the project root use `npm run dev:backend`. See [the root README](../README.md) for Firebase setup.

`src/config` initializes Firebase and selects the explicit authentication mode. `middleware` verifies ID tokens, enforces signed role claims, validates request bodies, and protects sensitive actions. `routes/public.js`, `routes/student.js`, and `routes/admin.js` separate the API surfaces. `controllers` handles authentication and catalog changes; `services` provides persistence, curriculum, progress, quiz grading, and certificate eligibility. `utils` contains seeding, role bootstrap, and error helpers.

All persistence goes through `store`. Its Firestore adapter runs business mutations in transactions, deferring writes until reads finish. Created/updated timestamps use Firebase server timestamps. Its development adapter commits a cloned JSON document atomically and serializes mutations. This adapter supports one local server process only.

Uploads pass through Express, with a 10 MB limit, MIME allowlist and file-signature checks. Files remain private. The API grants downloads to owners, admins, enrolled learners with an unlocked lesson containing the resource, and instructors reviewing an assigned project.

Certificates require current lesson completion, required quiz passes, and an approved project when configured. The platform and course certificate toggles are enforced on the server. Resetting progress clears quiz attempts and revokes existing certificates. Certificate verification exposes only the intended public certificate fields.

The AI endpoint currently returns `501`; it does not contact OpenAI. Add server-side provider integration, quota limits, and explicit usage policies before enabling generation.

Local configuration is read from `backend/.env`, regardless of the working directory. Demo records use `.data/demo.json` and private uploads use `uploads/` inside this folder. `DEMO_DATA_FILE` and `UPLOADS_DIR` can override these paths; relative overrides resolve from the backend folder. Firebase deployment rules and indexes are in `firebase/`; run the Firebase CLI from this folder to use `firebase.json`.
