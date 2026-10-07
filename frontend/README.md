# AI Atlas frontend

React, Vite, and Tailwind application. Install dependencies from the project root with `npm install`.

From this folder, run `npm run dev`, `npm run build`, or `npm run preview`. From the root, `npm run dev` starts both applications and `npm run dev:frontend` starts only the frontend. The development API proxy connects to `http://localhost:4000`.

Copy `.env.example` to `.env` in this folder to configure Firebase Authentication and the API URL. See [the root README](../README.md) for setup. Production builds are written to `dist/`. For Vercel deployment, select `frontend` as the project root.

`src/` contains the active application, organized by components, context, hooks, layouts, pages, routes, services, and styles. `public/` contains static assets.
