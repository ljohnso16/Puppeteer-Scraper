const puppeteer = require("puppeteer");

// Ensure environment variables are loaded only if required
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const scrapeLogic = async (res) => {
  const accountNumber = process.env.ACCOUNT_NUMBER;
  const password = process.env.PASSWORD;

  if (!accountNumber || !password) {
    console.error("Environment variables ACCOUNT_NUMBER and PASSWORD are required.");
    res.send("Environment variables ACCOUNT_NUMBER and PASSWORD are not set.");
    return;
  }

  const browser = await puppeteer.launch({
    headless: true, // Change to true for headless operation
    slowMo: 100,
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

  console.log("Browser launched.");

  try {
    const page = await browser.newPage();
    console.log("New page created.");

    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

    console.log("Navigating to https://www.ana.co.jp/en/jp/international/");
    await page.goto("https://www.ana.co.jp/en/jp/international/", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    console.log("Page loaded.");

    console.log("Setting viewport to 1080x1024.");
    await page.setViewport({ width: 1080, height: 1024 });

    // Step 1: Click the first link
    const firstSpanSelector = "li[id^='be-overseas-tertiary-tab__item3']";
    console.log(`Waiting for first element: ${firstSpanSelector}`);
    await page.waitForSelector(firstSpanSelector, { timeout: 20000 });
    console.log("First element found. Clicking it...");
    await page.click(firstSpanSelector);

    // Step 2: Click the second link and handle the new tab
    const secondLinkSelector = 'a[data-scclick-element="international-reserve-award_txt_flightAwardReservations"]';
    console.log('Waiting for "Flight Award Reservations" link...');
    await page.waitForSelector(secondLinkSelector, { visible: true, timeout: 5000 });

    console.log('Clicking "Flight Award Reservations"...');
    const [newPagePromise] = await Promise.all([
      new Promise((resolve) => browser.once("targetcreated", (target) => resolve(target.page()))),
      page.click(secondLinkSelector), // Click opens new tab
    ]);

    const newPage = await newPagePromise;
    console.log("Switched to the new tab.");

    console.log("Waiting for new tab to load...");
    await newPage.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("New tab loaded and ready.");

    console.log("Ensuring new page is fully loaded...");
    await newPage.waitForFunction(() => document.readyState === "complete", { timeout: 90000 });

    // Step 3: Perform login
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

    // Step 4: Look for the "Multiple cities/Mixed classes" link
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
