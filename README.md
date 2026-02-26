# 🥏 Bag Tag Rankings

## Features

- **Leaderboard** — Per-division rankings (Mixed, Female, Junior, Senior) with #1 tag as the goal
- **Players** — Full player management (add, edit, toggle active/inactive, delete)
- **Challenges** — Record direct (1v1) and group challenges with automatic tag reassignment
- **History** — Complete audit log of all bag tag changes


## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste + run the contents of `supabase-schema.sql`
3. Copy your **Project URL** and **anon public key** from Project Settings → API

### 2. Environment Variables

Create a `.env` file (copy from `.env.example`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Local Development

```bash
npm install
npm run dev
```

### 4. Deploy to Vercel

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add your env vars in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

---

## How Challenges Work

### Direct Challenge (1v1)
- Two players compete for their tags
- **Winner always gets the lower (better) tag number**
- Loser gets the higher tag number
- If the challenger beats someone with a lower tag, they swap

### Group Challenge
- Multiple players compete (round, tournament, etc.)
- All their current tag numbers are pooled together
- Tags are redistributed by finishing position: **1st gets the lowest available tag**
- This allows entire groups to shuffle rankings in a single event

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `players` | Player profiles with bag tag assignments |
| `challenges` | Challenge events (Direct or Group) |
| `challenge_participants` | Links players to challenges with before/after tags |
| `bag_tag_history` | Automatic audit log of all tag changes (via trigger) |

---

## Tech Stack

- **Frontend**: React 18, React Router v6, Vite
- **Backend**: Supabase (PostgreSQL + auto-generated REST API)
- **Hosting**: Vercel
- **Fonts**: Bebas Neue, DM Sans, JetBrains Mono
