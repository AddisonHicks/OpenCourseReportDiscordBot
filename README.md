# OpenCourseReport Discord Bot

Discord bot companion for [OpenCourseReport](https://github.com/AddisonHicks/OpenCourseReport). Posts new golf course condition reports to a channel each server configures, filtered by city/state radius.

## Features

- Per-server configuration via slash commands
- Real-time notifications when new reports are submitted (Supabase Realtime)
- Rich embeds with all report fields, course link, and submit link
- Radius filtering using the same zip-code distance logic as the web app

## Prerequisites

1. **Discord application** — [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a bot and copy the token
   - Copy the Application ID (`DISCORD_CLIENT_ID`)
   - OAuth2 invite URL scopes: `bot` + `applications.commands`
   - Bot permissions: Send Messages, Embed Links, Send Messages in Threads, Use Slash Commands

2. **Supabase access** — service role key from the OpenCourseReport project

3. **Enable Realtime** on the `reports` table (one-time):

```sql
alter publication supabase_realtime add table reports;
```

Or run [`supabase/enable-realtime.sql`](supabase/enable-realtime.sql) in the Supabase SQL Editor.

## Setup

```bash
cp .env.example .env.local
# Fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

npm install
npm run dev    # development with hot reload
npm run build && npm start   # production
```

Local dev loads `.env` first, then `.env.local` (overrides). Use either file; `.env.local` is recommended for secrets.

## Slash Commands

Requires **Manage Server** permission.

| Command | Description |
|---------|-------------|
| `/setup channel:#channel` | Set the notification channel (text channel or existing forum thread) |
| `/settings location city:... state:... radius:75` | Set area filter and enable notifications |
| `/settings view` | Show current settings |
| `/settings disable` | Pause notifications |
| `/settings enable` | Resume notifications |

### Forum threads

To post into a **single fixed thread** in a forum channel:

1. In Discord, open the forum and create or open the thread you want reports in.
2. Run `/setup channel:` and select that **thread** (not the forum channel itself).
3. Ensure the bot role has **Send Messages in Threads** and **Embed Links** in that forum.

Each new report is posted as a message inside that thread — the bot does not create new threads.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Application ID |
| `SUPABASE_URL` | OpenCourseReport Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (read-only usage) |
| `SITE_URL` | Web app URL (default: `https://open-course-report.vercel.app`) |
| `DATABASE_PATH` | SQLite path for guild settings (default: `./data/bot.db`) |

## Deploy (Railway / Render)

1. Create a **worker** service (not a web service) from this repo
2. Set all environment variables from `.env.example`
3. Mount a **persistent volume** at `/app/data` (Docker) or set `DATABASE_PATH` to the mounted path
4. Start command: `node dist/index.js` (or use the included Dockerfile)

### Docker

```bash
docker build -t course-report-discord-bot .
docker run -d --env-file .env -v bot-data:/app/data course-report-discord-bot
```

## Architecture

- Listens for `INSERT` on Supabase `reports` via Realtime
- Loads course data for each new report
- For each enabled guild, checks if the course zip is within the configured radius
- Posts a Discord embed with link buttons to the course page and `/submit`

Guild settings and deduplication state are stored in local SQLite.

## Troubleshooting

### Bot is online but reports don't appear

`SUBSCRIBED` in the terminal only means the bot connected to Realtime — it does **not** mean the `reports` table is publishing events.

1. In the **OpenCourseReport Supabase project**, run:

```sql
alter publication supabase_realtime add table reports;
```

Or use [`supabase/enable-realtime.sql`](supabase/enable-realtime.sql).

2. Restart the bot (`npm run dev`).
3. Submit a new test report (reports submitted before Realtime was enabled are not replayed automatically).

**Verify Discord posting works** (bypasses Realtime):

```bash
npm run replay-latest
```

This posts the most recent report to all configured guilds within radius.

### Checklist

| Step | Command / check |
|------|-----------------|
| Channel set | `/setup channel:#channel` |
| Location set | `/settings location city:Athens state:GA radius:75` |
| Notifications on | `/settings view` shows **Enabled** |
| Realtime enabled | SQL above run in Supabase |
| Bot running | Terminal shows `Logged in as ...` and `SUBSCRIBED` |

### Other common causes

- **Course has no zipcode** — report is skipped (check terminal logs after the logging update)
- **Course outside radius** — widen radius or pick a closer city center
- **Bot was offline** — v1 does not backfill missed reports; use `npm run replay-latest` once

