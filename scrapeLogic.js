const puppeteer = require("puppeteer");
const axios = require("axios");

const scrapeLogic = async (res) => {
  const accountNumber = process.env.ACCOUNT_NUMBER;
  const password = process.env.PASSWORD;

  if (!accountNumber || !password) {
    console.error("Environment variables ACCOUNT_NUMBER and PASSWORD are required.");
    res.send("Environment variables ACCOUNT_NUMBER and PASSWORD are not set.");
    return;
  }

  console.log("Production environment variables loaded.");

  const browser = await puppeteer.launch({
    headless: new,
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

  console.log("Browser launched in headless mode.");

  try {
    const page = await browser.newPage();
    console.log("New page created.");

    page.on("response", async (response) => {
      const url = response.url();
      const headers = response.headers();
      const contentType = headers["content-type"];

      if (url.endsWith(".js") && contentType !== "application/javascript") {
        console.warn(`Detected JavaScript file with incorrect MIME type: ${url}`);
        try {
          const scriptContent = (await axios.get(url)).data;
          await page.evaluate(script => {
            const scriptElement = document.createElement("script");
            scriptElement.textContent = script;
            document.head.appendChild(scriptElement);
          }, scriptContent);
          console.log(`Injected script from ${url}`);
        } catch (err) {
          console.error(`Failed to fetch or inject script from ${url}:`, err);
        }
      }
    });

    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

    console.log("Navigating to https://www.ana.co.jp/en/jp/international/");
    await page.goto("https://www.ana.co.jp/en/jp/international/", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    console.log("Page loaded.");

    console.log("Setting viewport to 1080x1024.");
    await page.setViewport({ width: 1080, height: 1024 });

    const firstSpanSelector = "li[id^='be-overseas-tertiary-tab__item3']";
    console.log(`Waiting for first element: ${firstSpanSelector}`);
    await page.waitForSelector(firstSpanSelector, { timeout: 20000 });
    console.log("First element found. Clicking it...");
    await page.click(firstSpanSelector);

    const secondLinkSelector = 'a[data-scclick-element="international-reserve-award_txt_flightAwardReservations"]';
    console.log(`Waiting for second element: ${secondLinkSelector}`);
    await page.waitForSelector(secondLinkSelector, { visible: true, timeout: 5000 });
    console.log("Clicking second element...");
    const [newPagePromise] = await Promise.all([
      new Promise((resolve) => browser.once("targetcreated", (target) => resolve(target.page()))),
      page.click(secondLinkSelector),
    ]);
    console.log("New tab created. Switching to new tab.");

    const newPage = await newPagePromise;
    console.log("Waiting for new tab to load...");
    await newPage.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("New tab loaded and ready.");

    console.log("Ensuring new page is fully loaded...");
    await newPage.waitForFunction(() => document.readyState === "complete", { timeout: 90000 });
    console.log("New page fully loaded.");

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
