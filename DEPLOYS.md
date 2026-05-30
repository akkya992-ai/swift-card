# 🚀 Swift Cart - Production Deployment Guide

This guide details the complete, step-by-step roadmap to deploy **Swift Cart** as a high-performance, real-time, production-ready Full-stack application.

---

## 🏗️ 1. Architecture Overview
```
┌────────────────────────────────────────┐
│             Vercel Frontend            │
│        (Vite SPA + Tailwind CSS)       │
└───────────────────▲────────────────────┘
                    │ REST API & WS Broadcast
┌───────────────────▼────────────────────┐
│         Hosted Backend (Node.js)       │
│     (Express + Real-time WebSockets)   │
└───────────────────▲────────────────────┘
                    │ Secure RLS Queries
┌───────────────────▼────────────────────┐
│             Supabase Cloud             │
│   (PostgreSQL DB + Broadcast Channel)  │
└────────────────────────────────────────┘
```

---

## 🗄️ 2. Backend Database Setup (Supabase)

Supabase serves as the persistent relational engine, powering real-time order tracking channels, RLS shields, and transactional locks.

### Step A: Provision Database & Tables
1. Go to the [Supabase Dashboard](https://supabase.com/) and create a new project.
2. Select your geographical region and project name (`swift-cart-backend`).
3. Click on the **SQL Editor** tab from the left sidebar.
4. Paste the entire content of [`schema.sql`](/schema.sql) into a new SQL query worksheet.
5. Click **Run** to execute the queries. This provisions the core Postgres types, indexes, and stock-lock transaction triggers.

### Step B: Enable Realtime Broadcasts & Row-Level Security
1. In the **SQL Editor**, open another query tab and execute the policies defined in [`supabase-security-policies.sql`](/supabase-security-policies.sql). This activates PostgreSQL Row-Level Security (RLS) on all user metadata schemas.
2. Under the **Database** -> **Replication** settings menu on Supabase, select `orders` and `riders` tables to enable Realtime Broadcast streams.

### Step C: Extract API Credentials
Navigate to **Project Settings** -> **API**:
- Copy **Project URL** (used as `SUPABASE_URL` and `VITE_SUPABASE_URL`).
- Copy **Anon public Key** (used as `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`).

---

## 💻 3. Frontend Deployment (Vercel)

Vercel provides static content deployment channels, asset compression, edge caching, and CDN optimization for the client bundle.

### Step A: Connect Repository
1. Push your Swift Cart codebase to a private/public GitHub repository.
2. Visit the [Vercel Dashboard](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository.

### Step B: Configure Build Settings
Ensure the build parameters are configured exactly as follows:
- **Framework Preset**: `Vite` (or `Other` / manual settings).
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Step C: Setup Environment Variables
Add the following key-value configurations inside **Vercel Project Settings** -> **Environment Variables**:
- `VITE_SUPABASE_URL`: (Paste your Supabase URL)
- `VITE_SUPABASE_ANON_KEY`: (Paste your Supabase Anon public key)

*Click **Deploy**. Your optimized Vite frontend is compiled and optimized with Webpack/Rollup code splitting.*

---

## 🧠 4. Dedicated Backend API Deployment (Railway / Render / Cloud Run)

Since Swift Cart features an Express server (`server.ts`) to handle Gemini AI, cart proxies, and orders state, you should deploy the Node.js server container to a cloud host.

### Step A: Configure package.json
Verify that your scripts in `package.json` list:
```json
"scripts": {
  "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
  "start": "node dist/server.cjs"
}
```

### Step B: Setup Environment Keys on Host Provider
Set up the following variables in your hosting container dashboard manager:
- `GEMINI_API_KEY`: *(Your Google Gemini API Key for smart catalogs)*
- `SUPABASE_URL`: *(Your Supabase URL)*
- `SUPABASE_ANON_KEY`: *(Your Supabase Anon key)*
- `PORT`: `3000` *(Default container port)*
- `NODE_ENV`: `production`

---

## 📈 5. Maintenance, Performance & SEO Tuning

### Image Optimization
- All images are integrated with `loading="lazy"` tags to improve First Contentful Paint (FCP).
- A fallback system is active inside `CustomerApp.tsx` which handles external CDN failures gracefully.

### Code-Splitting Diagnostics
- Vite is configured to optimize chunks dynamically. Heavy dependencies like `@supabase/supabase-js`, `lucide-react`, and `motion` are packed into independent network files so users receive a lightweight initial client footprint.

### Security Testing Checklist
- Validate that attempts to access `http://your-backend/api/health` return proper statuses.
- Perform an unauthorized SQL request to make sure Row Level Security throws an `Insufficient privileges` database response as configured.
