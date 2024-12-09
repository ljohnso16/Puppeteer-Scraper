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

    const flightAwardsLiSelector = 'li[id^="be-overseas-tertiary-tab__item3"]';
    await page.waitForSelector(flightAwardsLiSelector, { timeout: 5000 });
    console.log('Clicking "Flight Awards"...');
    await page.evaluate((selector) => {
      const liElement = document.querySelector(selector);
      if (liElement) {
        const spanElement = liElement.querySelector("span"); // Select the <span> inside the <li>
        if (spanElement) spanElement.click();
      }
    }, flightAwardsLiSelector);
    console.log('Flight Awards clicked.');
  
    // Take a screenshot after clicking "Flight Awards"
    console.log("Taking screenshot: click2.png...");
    await page.screenshot({ path: "click2.png" });
  
    // Wait for and click the "Flight Award Reservations" link
    console.log('Waiting for "Flight Award Reservations" link...');
    const flightAwardReservationsSelector = 'a[data-scclick-element="international-reserve-award_txt_flightAwardReservations"]';
    await page.waitForSelector(flightAwardReservationsSelector, { timeout: 5000 });
    console.log('Clicking "Flight Award Reservations"...');
    //waits untill the selector is available then clicks.
    
    const [newPagePromise] = await Promise.all([
      new Promise((resolve) => browser.once("targetcreated", (target) => resolve(target.page()))),
      page.click(flightAwardReservationsSelector), // Click opens new tab
    ]);
  
    const newPage = await newPagePromise;
    console.log("Switched to the new tab.");
  
    // Wait for the new tab to load
    await newPage.waitForTimeout(3000);
    console.log("New tab loaded.");
  
    // Simulate typing in the login form
    // Replace the final portion of your script with this:
    // Simulate typing in the login form
    console.log("Filling out the login form...");
    await newPage.waitForSelector("#accountNumber");
    await newPage.type("#accountNumber", "4134124806", { delay: 100 });
    await newPage.type("#password", "Batman203138", { delay: 100 });
    console.log("Login form filled out.");
  
    // Click the login button
    console.log("Clicking the login button...");
    await newPage.evaluate(() => {
      document.querySelector('#amcMemberLogin').click();
    });
    console.log("Login button clicked.");
  
    // Wait for navigation after login
    try {
      await Promise.all([
        newPage.waitForNavigation({ timeout: 30000, waitUntil: 'networkidle0' }),
        // You might need to adjust the selector below to match the element that appears after successful login
        newPage.waitForSelector('#hiddenSearchMode', { timeout: 30000 })
      ]);
      console.log("Login successful and page loaded!");
    } catch (error) {
      console.log("Navigation timeout or error:", error.message);
    }
  
    // Take a screenshot after login
    console.log("Taking screenshot after login: click4.png...");
    await newPage.screenshot({ path: "click4.png", fullPage: true });


    console.log("New tab loaded.");    
    const logStatement = "New tab loaded successfully.";
    console.log(logStatement);
    res.send(logStatement);
  } catch (error) {
    console.error("Error:", error);
    res.send(`Something went wrong while running Puppeteer: ${error.message}`);
  } finally {
    await browser.close();
  }
};

module.exports = { scrapeLogic };
