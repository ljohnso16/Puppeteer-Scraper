const puppeteer = require("puppeteer");

// Ensure that environment variables are loaded only if required
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const scrapeLogic = async (res) => {
  // Fetch environment variables
  const accountNumber = process.env.ACCOUNT_NUMBER;
  const password = process.env.PASSWORD;

  // Check if required environment variables are set
  if (!accountNumber || !password) {
    console.error("Environment variables ACCOUNT_NUMBER and PASSWORD are required.");
    res.send("Environment variables ACCOUNT_NUMBER and PASSWORD are not set.");
    return;
  }

  // Puppeteer browser launch options
  const browser = await puppeteer.launch({
    headless: TRUE, // Adjust to true if headless mode is preferred
    slowMo: 100,     // Slow down operations to make debugging easier
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH // Render-specific path for production
        : puppeteer.executablePath(),         // Default path for local development
  });

  console.log("Browser launched.");

  try {
    const page = await browser.newPage();
    console.log("New page created.");

    // Log browser console messages
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

    console.log("Navigating to URL: https://www.ana.co.jp/en/jp/international/");
    await page.goto("https://www.ana.co.jp/en/jp/international/", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    console.log("Page loaded.");

    console.log("Setting viewport to 1080x1024.");
    await page.setViewport({ width: 1080, height: 1024 });

    // Perform actions on the page
    const firstSpanSelector = "li[id^='be-overseas-tertiary-tab__item3'] span";
    console.log(`Waiting for first element: ${firstSpanSelector}`);
    await page.waitForSelector(firstSpanSelector, { timeout: 20000 });
    console.log("First element found. Clicking it...");
    await page.click(firstSpanSelector);

    const secondLinkSelector = "a[data-scclick-element='international-reserve-award_txt_flightAwardReservations'] span";
    console.log(`Waiting for second element: ${secondLinkSelector}`);
    await page.waitForSelector(secondLinkSelector, { visible: true, timeout: 30000 });

    console.log("Second element is visible. Scrolling to it...");
    await page.evaluate(selector => {
      const elem = document.querySelector(selector);
      if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, secondLinkSelector);

    console.log("Clicking the second element...");
    await page.click(secondLinkSelector);

    console.log("Waiting for new tab to open...");
    const target = await browser.waitForTarget(
      (target) => target.opener() === page.target(),
      { timeout: 60000 }
    );
    const newPage = await target.page();
    console.log("New tab opened.");

    console.log("Closing the original page...");
    await page.close();
    console.log("Original page closed.");

    console.log("Waiting for new page to load...");
    await newPage.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 });

    console.log("Ensuring new page is fully loaded...");
    await newPage.waitForFunction(() => document.readyState === "complete", { timeout: 90000 });
    console.log("New page is fully loaded.");

    // Login process
    const accountNumberSelector = "#accountNumber";
    const passwordSelector = "#password";
    const loginButtonSelector = "#amcMemberLogin";

    console.log(`Waiting for account number input field: ${accountNumberSelector}`);
    await newPage.waitForSelector(accountNumberSelector, { timeout: 20000 });
    console.log("Typing account number...");
    await newPage.type(accountNumberSelector, accountNumber);

    console.log(`Waiting for password input field: ${passwordSelector}`);
    await newPage.waitForSelector(passwordSelector, { timeout: 20000 });
    console.log("Typing password...");
    await newPage.type(passwordSelector, password);

    console.log(`Waiting for login button: ${loginButtonSelector}`);
    await newPage.waitForSelector(loginButtonSelector, { timeout: 20000 });
    console.log("Clicking login button...");
    await newPage.click(loginButtonSelector);

    console.log("Waiting for login to complete...");
    await newPage.waitForNavigation({ waitUntil: "networkidle0", timeout: 90000 });
    console.log("Login completed.");

    // Look for the "Multiple cities/Mixed classes" link
    const mixedClassesLinkSelector = "li.lastChild.deselection > a[role='tab']";
    console.log(`Searching for 'Multiple cities/Mixed classes' link: ${mixedClassesLinkSelector}`);
    const linkElement = await newPage.$(mixedClassesLinkSelector);

    if (linkElement) {
      console.log("Found the 'Multiple cities/Mixed classes' link. Clicking it now...");
      await newPage.click(mixedClassesLinkSelector);
      console.log("Clicked the 'Multiple cities/Mixed classes' link.");
      res.send("Successfully found and clicked the 'Multiple cities/Mixed classes' link.");
    } else {
      console.log("Could not find the 'Multiple cities/Mixed classes' link.");
      res.send("Could not find the 'Multiple cities/Mixed classes' link.");
    }
  } catch (e) {
    console.error("Error during Puppeteer execution:", e);
    res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    console.log("Closing browser...");
    await browser.close();
    console.log("Browser closed.");
  }
};

module.exports = { scrapeLogic };
