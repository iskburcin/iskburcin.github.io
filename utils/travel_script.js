function $(elem, from = document) {
    return from.querySelector(elem);
}

let allCountries = document.querySelectorAll("path");
allCountries.forEach((country) => {
    country.addEventListener("click", () => {
        console.log(country.getAttribute("title"));
    })
})
