if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js")
    .then(registration => {
      console.log("Service Worker Registered:", registration);
    })
    .catch(error => {
      console.log("Service Worker registration failed:", error);
    });
}
