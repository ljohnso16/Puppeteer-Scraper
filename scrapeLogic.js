const puppeteer = require("puppeteer");
require("dotenv").config();
const fs = require("fs");

// Ensure screenshots directory exists
if (!fs.existsSync("screenshots")) {
  fs.mkdirSync("screenshots");
}

const scrapeLogic = async (res) => {
  const links = []; // Array to store screenshot URLs
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
    links.push(`/screenshots/${initialScreenshotPath.split("/").pop()}`);
    res.write(`<a href="${links[links.length - 1]}" target="_blank">${links[links.length - 1]}</a><br>`);

    console.log("Waiting for network stability...");
    await waitForNetworkStability(page);

    console.log("Filling out the login form...");
    await page.waitForSelector("#accountNumber", { visible: true, timeout: 30000 });
    await page.type("#accountNumber", process.env.ACCOUNT_NUMBER, { delay: 100 });
    await page.type("#password", process.env.PASSWORD, { delay: 100 });

    const loginFormScreenshotPath = `screenshots/step2_login_form_filled_${Date.now()}.png`;
    console.log("Taking screenshot of login form...");
    await page.screenshot({ path: loginFormScreenshotPath, fullPage: true });
    console.log(`Login form screenshot saved to: ${loginFormScreenshotPath}`);
    links.push(`/screenshots/${loginFormScreenshotPath.split("/").pop()}`);
    res.write(`<a href="${links[links.length - 1]}" target="_blank">${links[links.length - 1]}</a><br>`);

    console.log("Clicking the login button...");
    await page.evaluate(() => {
      const loginButton = document.querySelector("#amcMemberLogin");
      if (loginButton) loginButton.click();
    });

    const postLoginScreenshotPath = `screenshots/step3_login_clicked_${Date.now()}.png`;
    console.log("Taking screenshot after login button clicked...");
    await page.screenshot({ path: postLoginScreenshotPath, fullPage: true });
    console.log(`Post-login screenshot saved to: ${postLoginScreenshotPath}`);
    links.push(`/screenshots/${postLoginScreenshotPath.split("/").pop()}`);
    res.write(`<a href="${links[links.length - 1]}" target="_blank">${links[links.length - 1]}</a><br>`);

    console.log("Waiting for login to complete...");
    let loginComplete = false;
    try {
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });
      loginComplete = true;
    } catch (error) {
      console.warn("Navigation timeout reached. Capturing fallback screenshot.");
    }

    const afterLoginScreenshotPath = `screenshots/step4_after_login_${Date.now()}.png`;
    console.log("Taking screenshot after login...");
    await page.screenshot({ path: afterLoginScreenshotPath, fullPage: true });
    console.log(`After-login screenshot saved to: ${afterLoginScreenshotPath}`);
    links.push(`/screenshots/${afterLoginScreenshotPath.split("/").pop()}`);
    res.write(`<a href="${links[links.length - 1]}" target="_blank">${links[links.length - 1]}</a><br>`);

    if (!loginComplete) {
      console.error("Login did not complete within the timeout.");
    }

    const finalScreenshotPath = `screenshots/step5_final_${Date.now()}.png`;
    console.log("Taking final screenshot...");
    await page.screenshot({ path: finalScreenshotPath, fullPage: true });
    console.log(`Final screenshot saved to: ${finalScreenshotPath}`);
    links.push(`/screenshots/${finalScreenshotPath.split("/").pop()}`);
    res.write(`<a href="${links[links.length - 1]}" target="_blank">${links[links.length - 1]}</a><br>`);

    console.log("Scraping completed successfully!");
    res.end("Scraping completed successfully!");
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
