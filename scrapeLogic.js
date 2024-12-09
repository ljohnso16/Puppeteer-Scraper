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
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });

  const waitForNetworkStability = async (page, maxIdleTime = 1000, maxWaitTime = 30000) => {
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
    await page.setViewport({ width: 1080, height: 1024 });

    // Step 1: Navigate to the first page
    console.log("Navigating to the main page...");
    await page.goto("https://www.ana.co.jp/en/jp/international/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    console.log("Taking initial screenshot...");
    await page.screenshot({ path: "step1_initial.png", fullPage: true });

    console.log("Waiting for network stability...");
    await waitForNetworkStability(page);

    // Step 2: Click "Flight Awards" tab
    const flightAwardsLiSelector = 'li[id^="be-overseas-tertiary-tab__item3"]';
    console.log('Clicking "Flight Awards"...');
    await page.waitForSelector(flightAwardsLiSelector, { timeout: 10000 });
    await page.evaluate((selector) => {
      const liElement = document.querySelector(selector);
      if (liElement) {
        const spanElement = liElement.querySelector("span");
        if (spanElement) spanElement.click();
      }
    }, flightAwardsLiSelector);

    console.log('"Flight Awards" clicked. Taking screenshot...');
    await page.screenshot({ path: "step2_flight_awards_clicked.png", fullPage: true });

    console.log("Waiting for network stabilization after clicking...");
    await waitForNetworkStability(page);

    // Step 3: Click "Flight Award Reservations"
    const flightAwardReservationsSelector =
      'a[data-scclick-element="international-reserve-award_txt_flightAwardReservations"]';
    console.log('Waiting for "Flight Award Reservations" link...');
    await page.waitForSelector(flightAwardReservationsSelector, { timeout: 10000 });

    console.log('Clicking "Flight Award Reservations"...');
    const [newPagePromise] = await Promise.all([
      new Promise((resolve) =>
        browser.once("targetcreated", async (target) => {
          const newPage = await target.page();
          resolve(newPage);
        })
      ),
      page.click(flightAwardReservationsSelector),
    ]);

    const newPage = await newPagePromise;
    console.log("Switched to the new tab. Taking screenshot...");
    await newPage.screenshot({ path: "step3_new_tab.png", fullPage: true });

    console.log("Waiting for network stabilization in the new tab...");
    await waitForNetworkStability(newPage);

    // Step 4: Perform login
    console.log("Filling out the login form...");
    await newPage.waitForSelector("#accountNumber", { timeout: 10000 });
    await newPage.type("#accountNumber", process.env.ACCOUNT_NUMBER, { delay: 100 });
    await newPage.type("#password", process.env.ACCOUNT_PASSWORD, { delay: 100 });

    console.log("Clicking the login button...");
    await newPage.evaluate(() => {
      const loginButton = document.querySelector("#amcMemberLogin");
      if (loginButton) loginButton.click();
    });

    console.log("Taking screenshot after login button clicked...");
    await newPage.screenshot({ path: "step4_login_attempt.png", fullPage: true });

    console.log("Waiting for login to complete...");
    await Promise.race([
      newPage.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
      newPage.waitForSelector("#hiddenSearchMode", { timeout: 60000 }),
    ]);

    console.log("Login successful. Taking a screenshot...");
    await newPage.screenshot({ path: "step5_after_login.png", fullPage: true });

    res.send("Scraping completed successfully!");
  } catch (error) {
    console.error("Error:", error.message);
    res.send(`Something went wrong: ${error.message}`);
  } finally {
    await browser.close();
  }
};

module.exports = { scrapeLogic };
