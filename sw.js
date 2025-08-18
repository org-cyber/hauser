self.addEventListener("install", e=> {
    e.waitUntil(
        catches.open("static").then(cache =>{
            return cache.addAll(["./", "index.html", "/dashboard.html", "/img/logo1.jpg"]);
        })
    )
});

