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
      "EMAIL and PASSWORD must be set in .env for automated login"
    );
  }

  const cookiesState = await loadCookies();

  const browser = await chromium.launch({ headless, args: ["--no-sandbox"] });
  let context;
  try {
    if (cookiesState) {
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

    const currentUrl = page.url();
    if (
      /login.microsoftonline.com|login.microsoft.com/.test(currentUrl) ||
      (await page.$(
        'input[type="email"], input[name="loginfmt"], input[id^="i0116"]'
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

        try {
          await emailInput.press("Enter");
        } catch (e) {
          console.log("Failed to press Enter after entering email.");
        }
      } catch (e) {
        console.log(
          "Failed to enter email. Email may be incorrect or input not found."
        );
      }

      // Wait for password input
      try {
        await page.waitForSelector(
          'input[type="password"], input[id^="i0118"]',
          { timeout: 20000 }
        );
        const passInput = page.getByRole("textbox", {
          name: /password/i,
        });

        await passInput.waitFor({ state: "visible", timeout: 30000 });

        await passInput.click();
        await passInput.fill(password);

        try {
          await passInput.press("Enter");
        } catch (e) {
          console.log("Failed to press Enter after entering password.");
        }
      } catch (e) {
        console.log(
          "Failed to enter password. Password may be incorrect or input not found."
        );
      }

      // After submitting credentials, Microsoft may require MFA code
      let needOtp = false;
      try {
        needOtp = await page
          .locator('[role="button"][data-value="OneWaySMS"]')
          .waitFor({ timeout: 8000 })
          .then(() => true)
          .catch(() => false);
      } catch (e) {
        needOtp = false;
      }

      if (needOtp) {
        try {
          await page.locator('[role="button"][data-value="OneWaySMS"]').click();
        } catch (e) {
          console.log("Couldn't press SMS verification button.");
        }
        const code = await promptTerminal(
          "Enter SMS verification code (or press Enter to abort): "
        );
        if (!code) {
          throw new Error("SMS verification required but no code provided");
        }
        const codeInput = page.locator(
          'input[type="tel"], input[name="otc"], input[id*="otc"]'
        );

        try {
          await codeInput.waitFor({ timeout: 30000 });
          await codeInput.fill(code);
          try {
            await codeInput.press("Enter");
          } catch (e) {
            console.log("Failed to press Enter after entering SMS code.");
          }
        } catch (e) {
          console.log(
            "Failed to enter SMS code. Code may be incorrect or input not found."
          );
        }

        // Handle "Stay signed in?" prompt
        try {
          const yesButton = page.locator("#idSIButton9");

          await yesButton.waitFor({
            state: "visible",
            timeout: 15000,
          });

          await yesButton.click();
          console.log('Clicked "Stay signed in"');
        } catch (e) {
          console.log("Failed to click 'Stay signed in' button.");
        }
      }

      try {
        await page.waitForURL(/colesgroup\.sharepoint\.com|mycoles/, {
          timeout: 30000,
        });
      } catch (e) {
        console.log(
          "Login may have failed or took too long, still waiting for token..."
        );
      }
    }

    const foundToken = await tokenPromise;

    try {
      const state = await context.storageState();
      await saveCookies(state);
    } catch (e) {
      // ignore
    }

    if (foundToken) {
      return foundToken;
    }

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
      await browser.close();
    } catch (e) {
      throw new Error("Failed to close browser: " + e.message);
    }
  }
}
