# Frontend Deployment & Update Guide

## How to Update the Frontend

### 1. Local Development (Testing Changes)

```bash
cd CVcreator_frontend
npm install          # Install dependencies (if needed)
npm run dev          # Start dev server at http://localhost:5173
```

### 2. Build for Production

```bash
cd CVcreator_frontend
npm run build
```

This creates an optimized build in the `dist/` folder.

### 3. Deploy the Build

**Option A: Static hosting (Vercel, Netlify, GitHub Pages)**

- Connect your repo to the hosting service
- Set build command: `npm run build`
- Set output directory: `dist`
- Add environment variables in the dashboard (e.g. `VITE_API_URL` if used)

**Option B: Manual deploy**

- Copy the contents of `dist/` to your web server (Apache, Nginx, etc.)
- Point the server to serve the `dist` folder

**Option C: Serve locally**

```bash
npm run preview   # Serves the built app (default port 4173)
```

### 4. Environment Variables

Create `.env` in `CVcreator_frontend/` if you use API URLs:

```
VITE_API_URL=http://localhost:8000   # Backend API base URL
```

Rebuild after changing `.env`.

### 5. Quick Update Checklist

1. Pull latest code: `git pull`
2. Install deps: `npm install`
3. Build: `npm run build`
4. Deploy the new `dist/` folder

---

## Premium Features (Current Setup)

- **Premium templates:** 2, 5, 7, 11, 14, 16 — require payment to use
- **Enhance CV:** CV grading + AI-enhanced resume — requires payment
- Payment unlocks both premium templates and Enhance CV
