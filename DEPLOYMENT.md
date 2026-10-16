# Storyline deployment

The deployment uses Vercel for the Next.js frontend, Render for the Node API and Python ingestion process, and the existing Neon PostgreSQL database.

## Render API

1. Push this project to a GitHub repository at the project root.
2. In Render, create a **Blueprint** from that repository. Render reads `render.yaml` and builds the API and Python scraper together from the root `Dockerfile`.
3. Add these secret values to the `storyline-api` service in Render:
   - `DATABASE_URL`: the Neon connection string.
   - `FRONTEND_URL`: the deployed Vercel origin, for example `https://storyline-yourname.vercel.app`.
4. Deploy and confirm `https://<render-service>.onrender.com/api/health` returns a healthy response.

`SCRAPER_PATH` and `PYTHON_CMD` are set in `render.yaml`. The Python pipeline shares the same Neon database as the API.

## Vercel frontend

1. Import the same GitHub repository into Vercel.
2. Set the project **Root Directory** to `frontend`.
3. Add the environment variable `NEXT_PUBLIC_API_URL` with the API base URL, including `/api`, for example `https://<render-service>.onrender.com/api`.
4. Deploy and open the Vercel URL. The API's CORS configuration permits Vercel origins; setting `FRONTEND_URL` in Render also allows the exact production origin.

After both services are deployed, run the ingest action from Storyline and confirm the timeline and story details load from the hosted API.
