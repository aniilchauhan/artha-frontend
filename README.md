# Axion Frontend

High-performance Next.js 15 quantitative trading and stock market analytics UI.

## Features
- Interactive Charts, Real-time market scanners, Wall Street institutional suites
- Decoupled from heavy backend/ML dependencies for ultra-fast builds (<30 seconds)
- Transparent Next.js API rewrites to the Axion backend

## Environment Variables
Create `.env.local` for local development:
```env
# URL of your deployed or local Axion Backend
BACKEND_API_URL=http://localhost:4000
```

## Running Locally
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

## Deploying to Vercel (100% Free)
1. Push this folder to a new GitHub repository (`axion-frontend`).
2. Import into [Vercel](https://vercel.com).
3. Set Environment Variable:
   - `BACKEND_API_URL`: The URL of your Axion Backend (e.g. `https://axion-backend.onrender.com` or Railway/HuggingFace).
4. Deploy!
