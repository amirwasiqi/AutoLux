# AutoLux — Phase 1: Foundation & Design System

## Included
- React 19 + Vite + JavaScript JSX frontend
- MUI theme, Tailwind CSS, React Router and Axios
- Framer Motion, GSAP and Lenis animation foundations
- Responsive cinematic AutoLux public landing page
- Express 5 API, native PostgreSQL `pg` pool and SQL migrations
- Health/readiness endpoints, environment templates and architecture docs

## Run locally
Backend:
```bash
cd backend
cp .env.example .env
# Configure DATABASE_URL
npm install
create the database in the pgAdmin
npm run db:migrate
npm run dev
```
Frontend:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Frontend: http://localhost:5173  
API health: http://localhost:4000/api/health

Node.js 20+ and PostgreSQL 15+ are recommended. Never commit `.env` files. Phase 1 does not yet implement authentication, live catalogs, bookings, checkout or payments; those are assigned to later phases. Source files are readable and use `.jsx`, not TypeScript.
