# Retirement Planner

A two-phase retirement planning tool:
- **Phase 1** — Multi-bucket accumulation simulator (401k, Roth IRA, Brokerage, Crypto, 529s)
- **Phase 2** — Retirement tax strategy with 4 withdrawal strategies, RMDs, Monte Carlo simulation

## Deploy to Vercel (5 minutes)

### Option A — GitHub + Vercel (recommended)
1. Create a free account at [github.com](https://github.com) if you don't have one
2. Create a new repository (e.g. `retirement-planner`)
3. Push this folder to that repo:
   ```bash
   cd retirement-planner
   git init
   git add .
   git commit -m "initial"
   git remote add origin https://github.com/YOUR_USERNAME/retirement-planner.git
   git push -u origin main
   ```
4. Go to [vercel.com](https://vercel.com) → sign in with GitHub → "Add New Project"
5. Import your `retirement-planner` repo → click **Deploy**
6. Done — your app is live at `https://retirement-planner-xxx.vercel.app`

### Option B — Vercel CLI (no GitHub needed)
1. Install Node.js from [nodejs.org](https://nodejs.org) (LTS version)
2. Open a terminal in this folder and run:
   ```bash
   npm install -g vercel
   vercel
   ```
3. Follow the prompts — it deploys in ~60 seconds

## Run locally
```bash
npm install
npm run dev
```
Then open [http://localhost:3000](http://localhost:3000)

## Tech stack
- Next.js 14 (App Router)
- React 18
- Recharts
- localStorage for persistence (no backend needed)
