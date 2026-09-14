# Adanse — Thesis Analysis MVP

A clean thesis workflow from research context to statistical analysis and a Word-ready Chapter 4.

## Run locally

```powershell
npm install
npm run dev
```

Copy `.env.example` to `.env` and set:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_BASE=http://127.0.0.1:8000/api/v1
```

## Product flow

Research context → Dataset → Analysis plan → Results → Chapter 4 → Follow-up research chat.

The authentication screen intentionally remains restrained and simple. The thesis workspace is more structured than a generic chatbot: Adanse asks for the research context first, maps objectives to real dataset variables, chooses supported methods, explains why, and then produces a grounded Word chapter.
