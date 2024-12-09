const puppeteer = require("puppeteer");
require("dotenv").config();

const scrapeLogic = async (res) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
      "--disable-blink-features=AutomationControlled", // Prevent detection
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");

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

  try {
    const page = await browser.newPage();
    //await page.setViewport({ width: 1080, height: 1024 });

    // Step 1: Navigate to the login page directly
    console.log("Navigating to the login page...");
    await page.goto(
      "https://aswbe-i.ana.co.jp/international_asw/pages/award/search/roundtrip/award_search_roundtrip_input.xhtml?rand=<%Rand_Time>",
      {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      }
    );

    console.log("Taking initial screenshot...");
    await page.screenshot({ path: "step1_initial.png", fullPage: true });

    console.log("Waiting for network stability...");
    await waitForNetworkStability(page);

    // Step 2: Fill out the login form
    console.log("Filling out the login form...");
    await page.waitForSelector("#accountNumber", { timeout: 10000 });
    await page.type("#accountNumber", process.env.ACCOUNT_NUMBER, { delay: 100 });
    await page.type("#password", process.env.ACCOUNT_PASSWORD, { delay: 100 });

    console.log("Taking screenshot of login form...");
    await page.screenshot({ path: "step2_login_form_filled.png", fullPage: true });

    console.log("Clicking the login button...");
    await page.evaluate(() => {
      const loginButton = document.querySelector("#amcMemberLogin");
      if (loginButton) loginButton.click();
    });

    console.log("Taking screenshot after login button clicked...");
    await page.screenshot({ path: "step3_login_clicked.png", fullPage: true });

    console.log("Waiting for login to complete...");
    await Promise.race([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
      page.waitForSelector("#hiddenSearchMode", { timeout: 60000 }),
    ]);

    console.log("Login successful. Taking a screenshot...");
    await page.screenshot({ path: "step4_after_login.png", fullPage: true });

    res.send("Scraping completed successfully!");
  } catch (error) {
    console.error("Error:", error.message);
    res.send(`Something went wrong: ${error.message}`);
  } finally {
    await browser.close();
  }
};

module.exports = { scrapeLogic };
