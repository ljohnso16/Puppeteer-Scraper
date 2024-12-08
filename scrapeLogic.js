const puppeteer = require("puppeteer");
require("dotenv").config();

const scrapeLogic = async (res) => {
  const accountNumber = process.env.ACCOUNT_NUMBER;
  const password = process.env.PASSWORD;

  if (!accountNumber || !password) {
    console.error("Environment variables ACCOUNT_NUMBER and PASSWORD are required.");
    res.send("Environment variables ACCOUNT_NUMBER and PASSWORD are not set.");
    return;
  }

  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100, // Adds a 100ms delay between actions
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

    // Capture browser console logs
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

    console.log("Navigating to the URL: https://www.ana.co.jp/en/jp/international/");
    await page.goto("https://www.ana.co.jp/en/jp/international/", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    console.log("Page loaded.");

    console.log("Setting viewport to 1080x1024 (original size).");
    await page.setViewport({ width: 1080, height: 1024 });

    const firstSpanSelector = "li[id^='be-overseas-tertiary-tab__item3'] span";
    console.log(`Waiting for first element: ${firstSpanSelector}`);
    await page.waitForSelector(firstSpanSelector, { timeout: 20000 });
    console.log("First element found. Clicking it...");
    await page.click(firstSpanSelector);

    const secondLinkSelector = "a[data-scclick-element='international-reserve-award_txt_flightAwardReservations'] span";
    console.log(`Waiting for second element: ${secondLinkSelector}`);
    await page.waitForSelector(secondLinkSelector, { timeout: 20000 });
    console.log("Second element found. Clicking it...");
    await page.click(secondLinkSelector);

    console.log("Waiting for new tab to open...");
    const target = await browser.waitForTarget(
      (target) => target.opener() === page.target(),
      { timeout: 60000 }
    );
    const newPage = await target.page();
    console.log("New tab opened.");

    // Close the old tab
    console.log("Closing the original page...");
    await page.close();
    console.log("Original page closed.");

    console.log("Waiting for new page to load...");
    await newPage.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("DOMContentLoaded event fired.");

    // Ensure the page is fully rendered
    console.log("Waiting for page to reach 'complete' ready state...");
    await newPage.waitForFunction(() => document.readyState === "complete", { timeout: 90000 });
    console.log("Page fully rendered (document.readyState === 'complete').");

    const accountNumberSelector = "#accountNumber";
    const passwordSelector = "#password";
    const loginButtonSelector = "#amcMemberLogin";

    // Debug point: Stopping here for verification before login attempt
    console.log("Stopping execution before login attempt.");
    console.log("Please verify the setup and resume to proceed with the login.");

    // The following login code is commented out for debugging purposes
    /*
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
    */

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
