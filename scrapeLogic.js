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

    await page.goto("https://www.ana.co.jp/en/jp/international/");

    // Set screen size
    await page.setViewport({ width: 1080, height: 1024 });

    // Type into search box
    //await page.type(".search-box__input", "automate beyond recorder");

    const firstSpanSelector = "li[id^='be-overseas-tertiary-tab__item3']";
    await page.waitForSelector(firstSpanSelector, { timeout: 20000 });
    await page.click(firstSpanSelector);

    // Wait and click on first result
    //const searchResultSelector = ".search-box__link";
    //await page.waitForSelector(searchResultSelector);
    //await page.click(searchResultSelector);

    // Locate the full title with a unique string
    const textSelector = await page.waitForSelector(
      "Flight Award Reservations"
    );
    const fullTitle = await textSelector.evaluate((el) => el.textContent);
    await page.click(textSelector);

    // Print the full title
    const logStatement = `The title of this blog post is ${fullTitle}`;
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