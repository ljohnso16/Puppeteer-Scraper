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

  try {
    const page = await browser.newPage();
    await page.goto("https://www.ana.co.jp/en/jp/international/");
    await page.setViewport({ width: 1080, height: 1024 });

    // Click on the first element
    const firstSpanSelector = "li[id^='be-overseas-tertiary-tab__item3']";
    await page.waitForSelector(firstSpanSelector, { timeout: 20000 });
    console.log("Clicking the first element...");
    await page.click(firstSpanSelector);
    console.log("First element clicked.");

    // Wait for and click the "Flight Award Reservations" link
    console.log('Waiting for "Flight Award Reservations" link...');
    const flightAwardReservationsSelector =
      'a[data-scclick-element="international-reserve-award_txt_flightAwardReservations"]';
    await page.waitForSelector(flightAwardReservationsSelector, { visible: true, timeout: 5000 });
    console.log('Clicking "Flight Award Reservations"...');

    // Wait for the new tab to be created and resolve the new page
    const [newPagePromise] = await Promise.all([
      new Promise((resolve) =>
        browser.once("targetcreated", (target) => resolve(target.page()))
      ),
      page.click(flightAwardReservationsSelector), // Click opens new tab
    ]);

    const newPage = await newPagePromise;
    if (!newPage) {
      throw new Error("Failed to find the new tab.");
    }
    console.log("Switched to the new tab.");

    // Wait for the new tab to load
    await newPage.bringToFront();
    console.log("Waiting for the new tab to load...");
    await newPage.waitForTimeout(3000); // Short timeout for page stabilization
    await newPage.waitForFunction(() => document.readyState === "complete", { timeout: 60000 });
    console.log("New tab loaded.");

    // Your further logic here...
    const logStatement = "New tab loaded successfully.";
    console.log(logStatement);
    res.send(logStatement);
  } catch (error) {
    console.error("Error:", error);
    res.send(`Something went wrong while running Puppeteer: ${error.message}`);
  } finally {
    await browser.close();
  }
};

module.exports = { scrapeLogic };
