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
      new Promise((resolve) => browser.once("targetcreated", async (target) => {
        const newPage = await target.page();
        resolve(newPage);
      })),
      page.click(secondLinkSelector),
    ]);

    console.log("New tab created. Switching to new tab.");

    await newPage.bringToFront();
    console.log("Waiting for new tab to load...");
    await newPage.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("New tab loaded and ready.");

    console.log("Ensuring new page is fully loaded...");
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