<div align="center">

# SpotFix AI

**An AI-assisted civic issue reporting and resolution platform.**

Citizens can report local problems and follow their progress. Civic teams can triage, assign, and resolve those reports with status updates, location data, and resolution evidence.

[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/API-Express-222222?logo=express&logoColor=white)](https://expressjs.com/)

</div>

## Overview

SpotFix AI brings civic issue reporting and department workflows into one application. Residents can submit issues such as damaged roads, waste, drainage problems, waterlogging, and broken streetlights. Administrators can review reports, route them to departments, monitor progress, and analyze trends.

The repository contains a React single-page application and an Express API backed by MongoDB. It supports role-based views for citizens, administrators, super administrators, and department officers.

## Features

- **Issue reporting:** submit a title, description, category, urgency, address, and location, with supporting images.
- **Triage and routing:** AI-assisted priority scoring, duplicate detection, and department assignment tools.
- **Status tracking:** complaint timelines, status changes, OTP-based public tracking, and escalation workflows.
- **Resolution evidence:** department officers can add work remarks and before/after images.
- **Operations dashboards:** admin and department views for filtering, assignment, workload, and performance.
- **Analytics and maps:** complaint analytics and map or heatmap views of reported issues.
- **Account workflows:** registration, authentication, profile management, password recovery, feedback, and trust scores.
- **Administration:** super administrators can manage users, departments, and administrator access requests.
- **Interface:** responsive layouts and light/dark theme support.

## Technology

- **Frontend:** React 19, Vite, React Router, Axios, Leaflet, Mapbox GL, Globe.gl, Recharts, and Lucide.
- **Backend:** Node.js 22, Express 5, Mongoose, JWT, and Multer.
- **Database:** MongoDB. In development, the backend can start an in-memory MongoDB instance when configured with a local MongoDB URI and no local MongoDB server is available.
- **Optional integrations:** Cloudinary for hosted image uploads and Brevo SMTP for email OTP delivery.
- **Deployment:** root Vercel configuration builds the frontend and routes API requests to the serverless Express entry point.

## Requirements

- Node.js 22.x and npm
- A MongoDB database for persistent application data
- Optional accounts/credentials for Cloudinary image hosting and Brevo SMTP email delivery

## Getting Started

1. Install dependencies from the repository root:

   ```bash
   npm install
   npm run install-all
   ```

2. Create `backend/.env` and configure at least the database URI and a development JWT secret:

   ```dotenv
   PORT=8080
   NODE_ENV=development
   MONGO_URI=mongodb://127.0.0.1:27017/spotfixai
   JWT_SECRET=replace-with-a-long-random-secret
   JWT_EXPIRE=7d
   CLIENT_URL=http://localhost:5173
   ```

   For local development, if no MongoDB process is listening and `MONGO_URI` points to `localhost` or `127.0.0.1`, the backend attempts to start `mongodb-memory-server`. Data in that in-memory database is temporary. Use a persistent MongoDB instance for data you need to keep.

3. Create `frontend/.env` so the Vite app sends API requests to the backend:

   ```dotenv
   VITE_API_URL=http://localhost:8080/api
   ```

4. Start the frontend and backend together:

   ```bash
   npm run dev
   ```

   The frontend is served at `http://localhost:5173`; the backend listens at `http://localhost:8080`. Check `http://localhost:8080/api/health` for the API health response.

### Environment Variables

| Variable | Location | Required | Purpose |
| --- | --- | --- | --- |
| `MONGO_URI` | `backend/.env` | Yes for persistence | MongoDB connection string. |
| `JWT_SECRET` | `backend/.env` | Yes in production | Secret used to sign authentication tokens. Set a long, unique value; do not use the development fallback. |
| `PORT` | `backend/.env` | No | Backend port; defaults to `8080`. |
| `NODE_ENV` | `backend/.env` | No | Runtime mode; defaults to `development`. |
| `JWT_EXPIRE` | `backend/.env` | No | Token lifetime; defaults to `7d`. |
| `CLIENT_URL` | `backend/.env` | No | Frontend origin allowed by CORS; defaults to `http://localhost:5173`. |
| `CLOUDINARY_CLOUD_NAME` | `backend/.env` | No | Cloudinary account name for hosted uploads. |
| `CLOUDINARY_API_KEY` | `backend/.env` | No | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | `backend/.env` | No | Cloudinary API secret. Keep private. |
| `BREVO_HOST` | `backend/.env` | For email OTP | Brevo SMTP host. |
| `BREVO_PORT` | `backend/.env` | For email OTP | Brevo SMTP port, commonly `587` or `465`. |
| `BREVO_USER` | `backend/.env` | For email OTP | Brevo SMTP username. |
| `BREVO_PASS` | `backend/.env` | For email OTP | Brevo SMTP key/password. Keep private. |
| `BREVO_FROM_EMAIL` | `backend/.env` | For email OTP | Verified sender email address. |
| `BREVO_FROM_NAME` | `backend/.env` | For email OTP | Sender display name. |
| `VITE_API_URL` | `frontend/.env` | No | API base URL; defaults to `/api`. Set this for local development as shown above. |
| `VITE_MAPBOX_TOKEN` | `frontend/.env` | No | Mapbox access token for map views that use Mapbox. |

Never commit `.env` files or put server secrets in `VITE_*` variables; Vite variables are included in the client bundle.

## Available Commands

Run these from the repository root unless noted otherwise:

| Command | Description |
| --- | --- |
| `npm run install-all` | Install backend and frontend dependencies. |
| `npm run dev` | Run the backend and Vite development server concurrently. |
| `npm run dev:backend` | Run the backend with nodemon. |
| `npm run dev:frontend` | Run the Vite development server. |
| `npm run build` | Install production/build dependencies and build the frontend. |
| `npm start` | Start the backend server. In production it serves `frontend/dist`. |
| `npm run lint --prefix frontend` | Run ESLint on the frontend. |
| `npm run seed:departments --prefix backend` | Seed the configured MongoDB database with departments. |
| `npm run seed:admin --prefix backend` | Seed an administrator account in the configured database. |

## API Overview

All API routes are prefixed with `/api`.

| Prefix | Area |
| --- | --- |
| `/api/health` | Health checks. `GET /api/health` returns service status. |
| `/api/auth`, `/api/otp` | Authentication and OTP workflows. |
| `/api/users`, `/api/departments` | User and department data. |
| `/api/complaints`, `/api/priority`, `/api/duplicates` | Complaints, priority scoring, and duplicate detection. |
| `/api/ai` | AI-assisted endpoints. |
| `/api/heatmap`, `/api/analytics` | Location-based views and analytics. |
| `/api/upload` | Image uploads. |
| `/api/admin-panel`, `/api/super-admin-panel`, `/api/department-panel` | Role-specific workflows. |
| `/api/feedback`, `/api/escalations` | Feedback and escalation workflows. |

## Deployment

### Vercel

The root `vercel.json` configures the frontend build and sends `/api/*` requests to `api/index.js`, which exports the Express app. Configure the following in the Vercel project settings:

- Build from the repository root with the existing `npm run build` command.
- Set `MONGO_URI` to a persistent, network-accessible MongoDB database.
- Set a strong `JWT_SECRET` and `NODE_ENV=production`.
- Set `CLIENT_URL` to the deployed frontend origin.
- Set the `BREVO_*` and `CLOUDINARY_*` variables if using email OTP or hosted uploads.
- Set `VITE_API_URL=/api` for the frontend build when frontend and API share the Vercel domain.

Do not rely on the development in-memory MongoDB fallback or local `backend/uploads` storage for production data. Serverless filesystems are not durable.

### Single Node.js Server

Build the frontend with `npm run build`, configure the production environment variables, then run `npm start`. In production mode, the Express server serves the built frontend and API from the same origin.

## Project Structure

```text
api/                 Serverless entry point
backend/
  config/            Database and integration configuration
  controllers/       HTTP request handlers
  middleware/        Authentication, authorization, and error handling
  models/            Mongoose data models
  routes/            API route definitions
  seeders/           Database seed scripts
  services/          Domain services
frontend/
  public/            Static assets
  src/               React application
```

## Security Notes

- Use unique production secrets and store them in the hosting provider's environment settings.
- Never commit database credentials, SMTP credentials, Cloudinary secrets, or production tokens.
- Restrict database network access and configure the production frontend origin in `CLIENT_URL`.
- Confirm administrator accounts and role permissions before exposing a deployment publicly.

## License

The package metadata declares the ISC License.
