Easi Roster → iCal
==================

Node.js script to fetch roster shifts from the Coles OneTeam API and export them to an iCalendar file for import into calendars (including Google Calendar).

Requirements
------------
- Node.js 18+ (ES modules)
- Network access to the roster API
- Auth cookies or bearer token from OneTeam

Setup
-----
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the example environment file and fill in your values:
   ```bash
   cp .env.example .env
   ```
   - `API_BASE_URL` usually stays as the default provided.
   - `PERSON_NUMBER` is your Coles person number.
   - Provide either `AUTH_BEARER_TOKEN` **or** `AUTH_COOKIE` (or both). Do not commit real credentials.

Usage
-----
Run with date range arguments (inclusive):
```bash
node src/index.js --dateFrom 2026-02-02 --dateTo 2026-02-08
```
This writes `roster.ics` in the project root.

Or let the default date range apply (Monday of the current week to Monday two weeks later):
```bash
node src/index.js
```

What it does
------------
- Loads auth and base URL from `.env`
- Builds the roster URL:
  `https://oneteam.mycoles.com.au/api/oneteam/rosters/{personNumber}/employeeEntity/Coles/dateFrom/YYYY-MM-DD/dateTo/YYYY-MM-DD`
- Fetches roster JSON via axios
- Parses `WeeklyRoster.CurrentWeekShift.ShiftBlockCollection`
- Converts each shift to an iCal event using `ical-generator`
- Saves `roster.ics` for easy import to calendar apps

Extending
---------
- **Google Calendar sync**: add a publisher step after `writeIcs` to upload the generated string with the Google Calendar API.
- **Cron scheduling**: wrap `main()` in a small scheduler (e.g., `node-cron` or system cron) to refresh nightly.
- **Multiple people**: loop across person numbers and append events to the same calendar.

HTTP server & containerisation
------------------------------
- Start a small HTTP server that serves the latest iCal directly:
  ```bash
  npm run serve
  # GET http://localhost:3000/roster.ics
  # Optional query params: ?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
  ```
- Build and run the Docker image:
  ```bash
  docker build -t easiroster .
  docker run -d --name easiroster -p 3000:3000 --env-file .env easiroster
  ```
- Example nginx reverse proxy (see `nginx.example.conf`) to expose `https://roster.your-domain.com/roster.ics`.
- With Cloudflare:
  - Point a DNS record (e.g. `roster.your-domain.com`) at your Proxmox host or Cloudflare Tunnel.
  - Enable HTTPS and proxying in Cloudflare.
  - In Google Calendar: “Add calendar from URL” → `https://roster.your-domain.com/roster.ics`.

Notes
-----
- Keep `.env` out of source control.
- The code is written for clarity so helpers (API client, parsing, iCal generation) are easy to swap or extend.