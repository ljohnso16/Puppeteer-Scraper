document.addEventListener("DOMContentLoaded", () => {
    const scrapeLink = document.getElementById("scrape-link");
    const fishContainer = document.getElementById("fish-container");
    scrapeLink.addEventListener("click", (event) => {fishContainer.classList.add("animate");});
  });
  