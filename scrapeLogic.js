const puppeteer = require("puppeteer");
require("dotenv").config();

const scrapeLogic = async (res) => {
  const browser = await puppeteer.launch({
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

    // Navigate to the target URL
    await page.goto("https://www.ana.co.jp/en/jp/international/");

    // Set the viewport size
    await page.setViewport({ width: 1080, height: 1024 });

    // Wait for the first <span> element and click it
    const firstSpanSelector = "li#be-overseas-tertiary-tab__item3-660994f6-6400-d8fc-2be8-ddcad16646c9 span";
    await page.waitForSelector(firstSpanSelector, { timeout: 10000 });
    await page.click(firstSpanSelector);

    // Wait for the second link to appear and click it
    const secondLinkSelector = "a[data-scclick-element='international-reserve-award_txt_flightAwardReservations'] span";
    await page.waitForSelector(secondLinkSelector, { timeout: 10000 });
    const [newPagePromise] = browser.waitForTarget((target) => target.opener() === page.target());
    await page.click(secondLinkSelector);

    // Wait for the new tab to open
    const newPage = await newPagePromise.page();

    // Wait for the new page to fully load
    await newPage.waitForNavigation({ waitUntil: "domcontentloaded" });

    // Close the original page
    await page.close();

    // Perform actions on the new page
    const newPageURL = newPage.url();
    console.log(`Navigated to new page: ${newPageURL}`);

    res.send(`Successfully navigated to the new page: ${newPageURL}`);
  } catch (e) {
    console.error(e);
    res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    await browser.close();
  }
};

module.exports = { scrapeLogic };
