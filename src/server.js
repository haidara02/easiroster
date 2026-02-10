import http from "node:http";
import { URL } from "node:url";
import { submitSMSCode, getAuthStatus, getFreshAccessToken } from "./auth.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = process.env.PORT || 3000;
const ICS_PATH = path.resolve("./roster.ics");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let templateHtml = null;

async function loadTemplate() {
  if (!templateHtml) {
    templateHtml = await fs.readFile(
      path.join(__dirname, "auth-status.html"),
      "utf-8",
    );
  }
  return templateHtml;
}

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
  const runtime = getAuthStatus();
  const template = await loadTemplate();
  const html = template
    .replace("{{tokenStatus}}", runtime.lastToken ? "Valid" : "Missing")
    .replace("{{authInProgress}}", runtime.authInProgress)
    .replace("{{waitingForSMS}}", runtime.waitingForSMS);

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
}

async function handleAuthStatusJSON(req, res) {
  const runtime = getAuthStatus();
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(runtime));
}

async function handleRefreshAuth(req, res) {
  getFreshAccessToken().catch((err) => {
    console.error("Auth flow error:", err.message);
  });
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ success: true }));
}

async function handleSubmitSMS(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;

  let code;
  try {
    const data = JSON.parse(body);
    code = data.sms_code;
  } catch (e) {
    // Try form-encoded as fallback
    const params = new URLSearchParams(body);
    code = params.get("sms_code");
  }

  if (!code) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "Missing SMS code" }));
    return;
  }

  try {
    submitSMSCode(code);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true }));
  } catch (e) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: e.message }));
  }
}

async function handleGenerateRoster(req, res) {
  try {
    const { defaultDateRange, generateRosterIcs } =
      await import("./service.js");
    const range = defaultDateRange();
    const { ics, shiftCount } = await generateRosterIcs({
      dateFrom: range.from,
      dateTo: range.to,
    });
    const outputPath = path.join(__dirname, "..", "roster.ics"); // to root for easier access
    await fs.writeFile(outputPath, ics, "utf-8");
    await fs.writeFile(ICS_PATH, ics, "utf-8");
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true, shiftCount }));
  } catch (err) {
    console.error("Roster generation error:", err.message);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/") {
    await handleAuthStatus(req, res);
    return;
  }

  if (req.method === "HEAD") {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/auth-status-json") {
    await handleAuthStatusJSON(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/refresh-auth") {
    await handleRefreshAuth(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/submit-sms") {
    await handleSubmitSMS(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/generate-roster") {
    await handleGenerateRoster(req, res);
    return;
  }

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end("Method Not Allowed");
    return;
  }

  if (req.method === "GET" && url.pathname === "/roster.ics") {
    await handleRosterRequest(req, res, url);
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("OK");
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not Found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on ${PORT}`);
});
