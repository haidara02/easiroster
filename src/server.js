import http from "node:http";
import { URL } from "node:url";
import {
  defaultDateRange,
  generateRosterIcs,
  validateDate,
  formatExpiry,
} from "./service.js";
import fs from "node:fs/promises";
import path from "node:path";

const PORT = process.env.PORT || 3000;
const ICS_PATH = path.resolve("./roster.ics");

async function handleRosterRequest(req, res, url) {
  try {
    const ics = await fs.readFile(ICS_PATH, "utf-8");
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.end(ics);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Failed to read roster.ics file.");
  }
}

async function handleAuthStatus(req, res) {
  let tokenStatus = "Unknown";
  let expiry = "Unknown";
  try {
    const cookiesRaw = await fs.readFile(
      path.resolve("./data/cookies.json"),
      "utf-8"
    );
    const c = JSON.parse(cookiesRaw);
    console.log("Loaded cookies:", c);
    const estauth = c.cookies.find((c) => c.name === "ESTSAUTHPERSISTENT");
    if (!estauth) console.log("Missing ESTSAUTHPERSISTENT");
    expiry = formatExpiry(estauth.expires);
    tokenStatus = "Loaded";
  } catch (e) {
    tokenStatus = "Missing";
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`
    <html>
      <head><title>Auth Status</title></head>
      <body>
        <h1>Authentication Status</h1>
        <p>Cookie status: <b>${tokenStatus}</b></p>
        <p>Cookie expiry: <b>${expiry}</b></p>
        <form method="POST" action="/refresh-auth">
          <button type="submit">Refresh Token (Run Playwright)</button>
        </form>
        <form method="POST" action="/submit-sms">
          <input name="sms_code" placeholder="Enter SMS code" />
          <button type="submit">Submit SMS Code</button>
        </form>
      </body>
    </html>
  `);
}

// TODO: Add POST handlers for /refresh-auth and /submit-sms to trigger Playwright login flow and accept SMS codes, respectively

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/roster.ics") {
    await handleRosterRequest(req, res, url);
    return;
  }

  if (req.method === "GET" && url.pathname === "/auth-status") {
    await handleAuthStatus(req, res);
    return;
  }

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end("Method Not Allowed");
    return;
  }

  if (url.pathname === "/" || url.pathname === "/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("OK");
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not Found");
});

// Only start the server if this file is run directly
if (
  import.meta &&
  import.meta.url &&
  import.meta.url.endsWith("/src/server.js")
) {
  server.listen(PORT, () => {
    console.log(`Roster server listening on port ${PORT}`);
  });
}
