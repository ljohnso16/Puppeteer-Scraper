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
      // Trigger the click and wait for the new tab to be created
      new Promise((resolve, reject) => {
        browser.once("targetcreated", async (target) => {
          try {
            const page = await target.page();
            if (page) {
              console.log("New tab detected.");
              resolve(page);
            } else {
              reject(new Error("Failed to find the new tab."));
            }
          } catch (err) {
            reject(err);
          }
        });
      }),
    
      // Click the link to open the new tab
      (async () => {
        console.log("Clicking the second element to open a new tab...");
        await page.click(secondLinkSelector);
      })(),
    ]);
    
    // Ensure the new page is valid
    if (!newPage) {
      throw new Error("New page could not be detected.");
    }
    
    // Bring the new tab to the foreground
    console.log("Switching to new tab.");
    await newPage.bringToFront();
    
    // Wait for the new tab to load
    console.log("Waiting for new tab to load...");
    await newPage.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 });
    
    // Ensure the new tab is fully loaded
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