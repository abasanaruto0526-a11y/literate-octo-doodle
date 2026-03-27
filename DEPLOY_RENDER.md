# Render Deployment

This repo can be deployed to Render as a single free web service.

What this setup does:
- Builds the React frontend in `frontend/`
- Starts the Express backend in `backend/`
- Serves the built frontend from the backend
- Uses same-origin `/api` calls in production

## Before you deploy

- Push this repository to GitHub
- Make sure `render.yaml` is in the repo root
- Prepare your `GEMINI_API_KEY` if you want AI analysis enabled

## Deploy steps

1. Open Render and create a new Blueprint deploy from this repository.
2. Render will read `render.yaml`.
3. Create the service.
4. In the service settings, add `GEMINI_API_KEY` if needed.
5. Wait for the first deploy to finish.

## Result

Your app will be available at:

`https://<your-service-name>.onrender.com`

The frontend and backend are served from the same origin, so no extra frontend API URL is required for production.

## Important limitation

This project currently stores data in a local JSON file via `lowdb`.

On Render's free web service, the filesystem is ephemeral. That means your notes and uploaded media can be lost after a restart or redeploy.

Use this setup for testing, demos, and early sharing. For durable storage, the next step is moving note/media storage to a managed database and object storage.
