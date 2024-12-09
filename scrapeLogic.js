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

    const firstSpanSelector = "li[id^='be-overseas-tertiary-tab__item3']";
    await page.waitForSelector(firstSpanSelector, { timeout: 20000 });
    await page.click(firstSpanSelector);
    console.log(`1st element clicked`);

    const secondLinkSelector = 'a[data-scclick-element="international-reserve-award_txt_flightAwardReservations"]';
    console.log(`Waiting for second element: ${secondLinkSelector}`);
    await page.waitForSelector(secondLinkSelector, { visible: true, timeout: 5000 });
    console.log("Clicking second element...");

    const [newPage] = await Promise.all([
      new Promise((resolve, reject) => {
        browser.once("targetcreated", async (target) => {
          try {
            const newPage = await target.page();
            if (newPage) {
              resolve(newPage);
            } else {
              reject(new Error("Failed to find the new tab."));
            }
          } catch (err) {
            reject(err);
          }
        });
      }),
      page.click(secondLinkSelector),
    ]);
    
    if (!newPage) {
      throw new Error("New page could not be detected.");
    }
    
    // Bring the new page to the foreground
    console.log("Switching to new tab.");
    await newPage.bringToFront();
    
    // Wait for the new page to fully load
    console.log("Waiting for new tab to load...");
    await newPage.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("New tab loaded.");
    
    // Ensure page readiness
    await newPage.waitForFunction(() => document.readyState === "complete", { timeout: 90000 });
    console.log("New page fully loaded.");
    const logStatement = `New page fully loaded.`;
    console.log(logStatement);
    res.send(logStatement);
  } catch (e) {
    console.error(e);
    res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    await browser.close();
  }
};

module.exports = { scrapeLogic };