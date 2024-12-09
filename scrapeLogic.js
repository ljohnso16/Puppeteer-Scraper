const puppeteer = require("puppeteer");
require("dotenv").config();
const fs = require("fs");

// Ensure screenshots directory exists
if (!fs.existsSync("screenshots")) {
  fs.mkdirSync("screenshots");
}

const scrapeLogic = async (res) => {
  try {
    const browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== "false",
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--remote-debugging-port=9222", // Expose debugging port
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    console.log("Navigating to the login page...");
    await page.goto(
      "https://aswbe-i.ana.co.jp/international_asw/pages/award/search/roundtrip/award_search_roundtrip_input.xhtml?rand=<%Rand_Time>",
      { waitUntil: "domcontentloaded", timeout: 30000 }
    );

    console.log("Taking initial screenshot...");
    const initialScreenshotPath = `screenshots/step1_initial_${Date.now()}.png`;
    await page.screenshot({ path: initialScreenshotPath, fullPage: true });
    console.log(`Initial screenshot saved to: ${initialScreenshotPath}`);

    console.log("Waiting for network stability...");
    await waitForNetworkStability(page);

    console.log("Filling out the login form...");
    await page.waitForSelector("#accountNumber", { visible: true, timeout: 30000 });
    try {
      const accountNumber = process.env.ACCOUNT_NUMBER;
      const accountPassword = process.env.PASSWORD;

      if (!accountNumber || typeof accountNumber !== "string") {
        throw new Error(
          "ACCOUNT_NUMBER is not set or is not a string in the environment variables."
        );
      }

      if (!accountPassword || typeof accountPassword !== "string") {
        throw new Error(
          "PASSWORD is not set or is not a string in the environment variables."
        );
      }

      console.log("Filling out the login form...");
      if (!(await page.$("#accountNumber"))) {
        throw new Error("Could not find #accountNumber field on the page.");
      }
      if (!(await page.$("#password"))) {
        throw new Error("Could not find #password field on the page.");
      }

      await page.type("#accountNumber", accountNumber, { delay: 100 });
      await page.type("#password", accountPassword, { delay: 100 });

      console.log("Login form filled.");
    } catch (error) {
      console.error("Error during login form filling:", error.message);
      throw error; // Re-throw error to handle it in the calling function
    }

    const loginFormScreenshotPath = `screenshots/step2_login_form_filled_${Date.now()}.png`;
    console.log("Taking screenshot of login form...");
    await page.screenshot({ path: loginFormScreenshotPath, fullPage: true });
    console.log(`Login form screenshot saved to: ${loginFormScreenshotPath}`);

    console.log("Clicking the login button...");
    await page.evaluate(() => {
      const loginButton = document.querySelector("#amcMemberLogin");
      if (loginButton) loginButton.click();
    });

    const postLoginScreenshotPath = `screenshots/step3_login_clicked_${Date.now()}.png`;
    console.log("Taking screenshot after login button clicked...");
    await page.screenshot({ path: postLoginScreenshotPath, fullPage: true });
    console.log(`Post-login screenshot saved to: ${postLoginScreenshotPath}`);

    console.log("Waiting for login to complete...");
    await Promise.race([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
      page.waitForSelector("#hiddenSearchMode", { timeout: 60000 }),
    ]);

    const afterLoginScreenshotPath = `screenshots/step4_after_login_${Date.now()}.png`;
    console.log("Login successful. Taking a screenshot...");
    await page.screenshot({ path: afterLoginScreenshotPath, fullPage: true });
    console.log(`After-login screenshot saved to: ${afterLoginScreenshotPath}`);

    // Add final screenshot when page finishes loading or timeout occurs
    console.log("Waiting for page to finish loading...");
    try {
      await page.waitForTimeout(30000); // Wait up to 30 seconds
      console.log("Final page state detected.");
    } catch {
      console.warn("Timeout reached while waiting for page to finish loading.");
    }
    const finalScreenshotPath = `screenshots/step5_final_${Date.now()}.png`;
    console.log("Taking final screenshot...");
    await page.screenshot({ path: finalScreenshotPath, fullPage: true });
    console.log(`Final screenshot saved to: ${finalScreenshotPath}`);

    res.send("Scraping completed successfully!");
  } catch (error) {
    console.error("Error occurred during scraping:", error);
    res.status(500).send(`Something went wrong: ${error.message}`);
  }
};

const waitForNetworkStability = async (page, maxIdleTime = 10000, maxWaitTime = 30000) => {
  let lastRequestTime = Date.now();
  const onRequest = () => {
    lastRequestTime = Date.now();
  };

  page.on("request", onRequest);

  try {
    const start = Date.now();
    while (Date.now() - start < maxWaitTime) {
      if (Date.now() - lastRequestTime > maxIdleTime) {
        console.log("Network stabilized.");
        return;
      }
      await page.waitForTimeout(500);
    }
    console.warn("Network stability timeout reached.");
  } finally {
    page.off("request", onRequest); // Clean up listener
  }
};

module.exports = { scrapeLogic };
