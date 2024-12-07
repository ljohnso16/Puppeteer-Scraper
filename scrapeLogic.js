const puppeteer = require("puppeteer");
require("dotenv").config();

const scrapeLogic = async (res) => {
  // Ensure environment variables are set
  const accountNumber = process.env.ACCOUNT_NUMBER;
  const password = process.env.PASSWORD;

  if (!accountNumber || !password) {
    console.error("Environment variables ACCOUNT_NUMBER and PASSWORD are required.");
    res.send("Environment variables ACCOUNT_NUMBER and PASSWORD are not set.");
    return;
  }

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
    await page.goto("https://www.ana.co.jp/en/jp/international/", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Set the viewport size
    await page.setViewport({ width: 1080, height: 1024 });

    // Wait for the first <span> element and click it
    const firstSpanSelector = "li[id^='be-overseas-tertiary-tab__item'] span";
    await page.waitForSelector(firstSpanSelector, { timeout: 20000 });
    await page.click(firstSpanSelector);

    // Wait for the second link to appear and click it
    const secondLinkSelector = "a[data-scclick-element='international-reserve-award_txt_flightAwardReservations'] span";
    await page.waitForSelector(secondLinkSelector, { timeout: 20000 });
    const [newPagePromise] = browser.waitForTarget((target) => target.opener() === page.target());
    await page.click(secondLinkSelector);

    // Wait for the new tab to open
    const newPage = await newPagePromise.page();

    // Wait for the new page to fully load
    await newPage.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 });

    // Close the original page
    await page.close();

    // Fill in the accountNumber and password fields
    const accountNumberSelector = "#accountNumber";
    const passwordSelector = "#password";
    const loginButtonSelector = "#amcMemberLogin";

    await newPage.waitForSelector(accountNumberSelector, { timeout: 20000 });
    await newPage.type(accountNumberSelector, accountNumber);

    await newPage.waitForSelector(passwordSelector, { timeout: 20000 });
    await newPage.type(passwordSelector, password);

    // Wait for the submit button and click it
    await newPage.waitForSelector(loginButtonSelector, { timeout: 20000 });
    await newPage.click(loginButtonSelector);

    // Wait for the next page to fully render
    await newPage.waitForNavigation({ waitUntil: "networkidle0", timeout: 90000 });
    await newPage.waitForFunction(() => document.readyState === "complete", { timeout: 90000 });

    // Locate and click the "Multiple cities/Mixed classes" link if found
    const mixedClassesLinkSelector = "li.lastChild.deselection > a[role='tab']";
    const linkElement = await newPage.$(mixedClassesLinkSelector);

    if (linkElement) {
      console.log("Found the 'Multiple cities/Mixed classes' link.");
      await newPage.click(mixedClassesLinkSelector);
      res.send("Successfully found and clicked the 'Multiple cities/Mixed classes' link.");
    } else {
      console.log("Could not find the 'Multiple cities/Mixed classes' link.");
      res.send("Could not find the 'Multiple cities/Mixed classes' link.");
    }
  } catch (e) {
    console.error(e);
    res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    await browser.close();
  }
};

module.exports = { scrapeLogic };
