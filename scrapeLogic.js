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
  headless: false, // Disable headless mode

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

    // Navigate to the target URL
    console.log("Navigating to the URL: https://www.ana.co.jp/en/jp/international/");
    await page.goto("https://www.ana.co.jp/en/jp/international/", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    console.log("Page loaded.");

    // Set the viewport size
    console.log("Setting viewport size.");
    await page.setViewport({ width: 1080, height: 1024 });

    // Wait for the first <span> element and click it
    const firstSpanSelector = "li[id^='be-overseas-tertiary-tab__item3-'] span";
    console.log(`Waiting for first element: ${firstSpanSelector}`);
    await page.waitForSelector(firstSpanSelector, { timeout: 20000 });
    console.log("First element found. Clicking it...");
    await page.click(firstSpanSelector);

    // Wait for the second link to appear and click it
    const secondLinkSelector = "a[data-scclick-element='international-reserve-award_txt_flightAwardReservations'] span";
    console.log(`Waiting for second element: ${secondLinkSelector}`);
    await page.waitForSelector(secondLinkSelector, { timeout: 20000 });
    console.log("Second element found. Clicking it...");
    await page.click(secondLinkSelector);

    // Wait for the new tab to open
    console.log("Waiting for new tab to open...");
    const target = await browser.waitForTarget(
      (target) => target.opener() === page.target(),
      { timeout: 60000 }
    );
    const newPage = await target.page();
    console.log("New tab opened.");

    // Wait for the new page to fully load
    console.log("Waiting for new page to load...");
    await newPage.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("New page loaded.");

    // Close the original page
    console.log("Closing original page...");
    await page.close();

    // Fill in the accountNumber and password fields
    const accountNumberSelector = "#accountNumber";
    const passwordSelector = "#password";
    const loginButtonSelector = "#amcMemberLogin";

    console.log(`Waiting for accountNumber input field: ${accountNumberSelector}`);
    await newPage.waitForSelector(accountNumberSelector, { timeout: 20000 });
    console.log("Account number input field found. Typing account number...");
    await newPage.type(accountNumberSelector, accountNumber);

    console.log(`Waiting for password input field: ${passwordSelector}`);
    await newPage.waitForSelector(passwordSelector, { timeout: 20000 });
    console.log("Password input field found. Typing password...");
    await newPage.type(passwordSelector, password);

    // Wait for the submit button and click it
    console.log(`Waiting for login button: ${loginButtonSelector}`);
    await newPage.waitForSelector(loginButtonSelector, { timeout: 20000 });
    console.log("Login button found. Clicking it...");
    await newPage.click(loginButtonSelector);

    // Wait for the next page to fully render
    console.log("Waiting for login to complete and new page to load...");
    await newPage.waitForNavigation({ waitUntil: "networkidle0", timeout: 90000 });
    console.log("Login successful. New page loaded.");

    await newPage.waitForFunction(() => document.readyState === "complete", { timeout: 90000 });
    console.log("Page fully rendered.");

    // Locate and click the "Multiple cities/Mixed classes" link if found
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
