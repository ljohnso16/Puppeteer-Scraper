document.addEventListener("DOMContentLoaded", () => {
    const scrapeLink = document.getElementById("scrape-link");
    const fishContainer = document.getElementById("fish-container");
  
    scrapeLink.addEventListener("click", (event) => {
      //event.preventDefault(); // Prevent the default link action
  
      // Add animation class to fish container
      fishContainer.classList.add("animate");
  
      // Optional: Remove the animation class after a delay to allow reactivation
    //   setTimeout(() => {
    //     fishContainer.classList.remove("animate");
    //   }, 5000); // Match the animation duration
     });
  });
  