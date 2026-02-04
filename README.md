EasiRoster
==================

Node.js project to fetch roster details from the Coles OneTeam API and export them to an iCalendar file for (automated) import into cloud-based scheduling services (i.e. Google Calendar, iCloud Calendar).

The existing MyColes rostering system has several friction points for quick roster checks:
- Slow fetch times on tablet/mobile devices
- Absence of important features such as shift history and roster notifications
- Integration with third-party scheduling services for convenience
- Frequent login/authentication requirements

My goal with EasiRoster is to improve Quality of Life by bautomating the roster retrieval process:
- Fetching the roster details from an existing API
- Transform each shift into an iCal event and append into a .ics file
- Serve/host the .ics file via nginx (/roster.ics)
- Subscribe to the file via Google or iCloud Calendar
- Enable cron scheduler to update /roster.ics on a set interval

### Roadmap:
- **Remote Deployment:** Move the service to a dedicated server accessible via a personal domain.
- **Automated Updates:** Wrap the main logic in a scheduler (e.g., node-cron or system crontab) to refresh nightly.
- **Automated Token Refresh**
  > The API tokens have a very short expiry, so users have to constantly reenter their tokens/cookies in .env, which kind of the defeats the purpose of this project. I'm hoping to change the auth design so that the user only has to input their prompted SMS code when the token expires.
- **Potential GUI Development**: Develop a dedicated Web or Windows-based interface to visualise user input and payload details (i.e. a dashboard)
  > If other team members find it useful, this will be expanded into a user-friendly, self-service tool.

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
   - `API_BASE_URL` is the Coles OneTeam API endpoint (usually stays as the default provided)
   - `PERSON_NUMBER` is your Coles employee ID.
   - Provide either `AUTH_BEARER_TOKEN` **or** `AUTH_COOKIE` (or both). Do not commit real credentials.

Usage
-----
### CLI Mode

Generate a roster for a specific range (inclusive):
```bash
node src/index.js --dateFrom 2026-02-02 --dateTo 2026-02-08
```
This writes `roster.ics` in the project root.

Or let the default date range apply (Monday of the current week to Monday two weeks later):
```bash
node src/index.js
```

### Server & Docker

Run a local server to expose the file at http://localhost:3000/roster.ics:
```bash
npm run serve
# GET http://localhost:3000/roster.ics
# Optional query params: ?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
```

Build and run the Docker image:
```bash
docker build -t easiroster .
docker run -d --name easiroster -p 3000:3000 --env-file .env easiroster
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

Notes
-----
- Keep `.env` out of source control.
- The code is written for clarity so helpers (API client, parsing, iCal generation) are easy to swap or extend.
