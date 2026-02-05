import fs from "fs/promises";
import path from "node:path";
import readline from "node:readline";
import { chromium } from "playwright";
import dotenv from "dotenv";

dotenv.config();

const COOKIE_PATH =
  process.env.COOKIE_PATH || path.resolve("./data/cookies.json");
const TARGET_URL =
  "https://colesgroup.sharepoint.com/sites/mycoles/work/hours/Pages/default.aspx";
const TOKEN_WAIT_MS = 60_000;

function promptTerminal(question, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    let timer = null;
    if (timeoutMs) {
      timer = setTimeout(() => {
        rl.close();
        reject(new Error("Timed out waiting for input"));
      }, timeoutMs);
    }
    rl.question(question, (answer) => {
      if (timer) clearTimeout(timer);
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function loadCookies() {
  try {
    const content = await fs.readFile(COOKIE_PATH, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

async function saveCookies(state) {
  try {
    await fs.mkdir(path.dirname(COOKIE_PATH), { recursive: true });
    await fs.writeFile(COOKIE_PATH, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    // ignore write failures
    console.warn("Warning: failed to persist cookies:", err.message);
  }
}

export async function getFreshAccessToken({
  headless = process.env.PLAYWRIGHT_HEADLESS !== "0",
} = {}) {
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;

  if (!email || !password) {
    throw new Error(
      "EMAIL and PASSWORD must be set in .env for automated login",
    );
  }

  const cookiesState = await loadCookies();

  const browser = await chromium.launch({ headless, args: ["--no-sandbox"] });
  let context;
  try {
    if (cookiesState) {
      // cookiesState may be a full storageState object (cookies + origins)
      context = await browser.newContext({ storageState: cookiesState });
    } else {
      context = await browser.newContext();
    }

    const page = await context.newPage();

    // Monitor requests for bearer token
    let token = null;
    const tokenListener = (req) => {
      try {
        const hdrs = req.headers();
        const auth = hdrs.authorization || hdrs.Authorization;
        if (auth && auth.startsWith("Bearer ")) {
          token = auth.split(" ")[1];
        }
      } catch (e) {
        // ignore
      }
    };

    page.on("request", tokenListener);

    const tokenPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, TOKEN_WAIT_MS);

      (async function poll() {
        const interval = 300;
        while (timeout) {
          if (token) {
            clearTimeout(timeout);
            resolve(token);
            return;
          }
          await new Promise((r) => setTimeout(r, interval));
        }
      })();
    });

    // Navigate to MyColes hours
    const response = await page
      .goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 60_000 })
      .catch(() => null);

    // If we are on Microsoft login, perform form fill
    const currentUrl = page.url();
    if (
      /login.microsoftonline.com|login.microsoft.com/.test(currentUrl) ||
      (await page.$(
        'input[type="email"], input[name="loginfmt"], input[id^="i0116"]',
      ))
    ) {
      // Email
      try {
        const emailInput = page.getByRole("textbox", {
          name: /email|phone|username/i,
        });

        await emailInput.waitFor({ state: "visible", timeout: 30000 });

        await emailInput.click();
        await emailInput.fill(email);

        // Important: Microsoft often requires Enter
        await emailInput.press("Enter");
      } catch (e) {
        // proceed
      }

      // Wait for password input
      try {
        await page.waitForSelector(
          'input[type="password"], input[id^="i0118"]',
          { timeout: 20000 },
        );
        const passInput = page.getByRole("textbox", {
          name: /password/i,
        });

        await passInput.waitFor({ state: "visible", timeout: 30000 });

        await passInput.click();
        await passInput.fill(password);

        // Important: Microsoft often requires Enter
        await passInput.press("Enter");
      } catch (e) {
        // continue even if not found
      }

      // After submitting credentials, Microsoft may require MFA code
      // Look for typical OTP inputs
      let needOtp = false;
      try {
        needOtp = await await page
          .locator('[role="button"][data-value="OneWaySMS"]')
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false);
      } catch (e) {
        needOtp = false;
      }

      if (needOtp) {
        await page.locator('[role="button"][data-value="OneWaySMS"]').click();
        const code = await promptTerminal(
          "Enter SMS verification code (or press Enter to abort): ",
        );
        if (!code) {
          throw new Error("SMS verification required but no code provided");
        }
        const codeInput = await page.$(
          'input[type="tel"], input[name*="code"], input[id*="otc"], input[name="otc"]',
        );
        if (!codeInput) throw new Error("Expected OTP input but not found");
        await codeInput.fill(code);
        await codeInput.press("Enter");
      }

      // Wait for redirect to target or final page load
      try {
        await page.waitForURL(/colesgroup\.sharepoint\.com|mycoles/, {
          timeout: 30000,
        });
      } catch (e) {
        // continue
      }
    }

    // Now wait a short while for pages to make API requests containing the token
    const foundToken = await tokenPromise;

    // Persist cookies/state
    try {
      const state = await context.storageState();
      await saveCookies(state);
    } catch (e) {
      // ignore
    }

    if (foundToken) {
      return foundToken;
    }

    // As a fallback, try to reload and wait once more
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => null);
    token = null;
    const foundToken2 = await new Promise((resolve) => {
      const start = Date.now();
      const check = setInterval(() => {
        if (token) {
          clearInterval(check);
          resolve(token);
        }
        if (Date.now() - start > TOKEN_WAIT_MS) {
          clearInterval(check);
          resolve(null);
        }
      }, 300);
    });

    if (foundToken2) return foundToken2;

    throw new Error("Failed to capture Bearer token from browser requests");
  } finally {
    try {
      // await browser.close();
    } catch (e) {
      // ignore
    }
  }
}
