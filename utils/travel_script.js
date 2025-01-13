function $(elem, from = document) {
    return from.querySelector(elem);
}

let allCountries = document.querySelectorAll("path");
allCountries.forEach((country) => {
    country.addEventListener("click", () => {
        country.style.fill = "green"
        d_container.classList.remove("hidden");
        apifun(country.getAttribute("title"));
    })
})

let lang = $("#language");
let name_c = $("#name");
let capital = $("#capital");
let bestdestinations = $("#bestdestinations");
let myMemories = $("#myMemories");
let flag = $("#flag");
let close = $("#close");
let d_container = $("#d_container");

function apifun(country) {
    const api = `https://restcountries.com/v3.1/name/${country}`
    fetch(api).then((response) => {
        return response.json()
    }).then((country_data) => {
        console.log(country_data);
        lang.innerHTML = Object.values(country_data[0].languages)
        name_c.innerHTML = country_data[0].name.common
        capital.innerHTML = country_data[0].capital[0];
        visitedCountryLinks(country);
        flag.src = country_data[0].flags.svg;
    })
}

close.addEventListener("click", () => {
    console.log(d_container.classList)
    d_container.classList.add("hidden")
    allCountries.forEach(country => {
        country.style.fill = "rgb(218, 218, 218)"
    })
});

function visitedCountryLinks(country) {
    switch (country) {
        case "Hungary":
            bestdestinations.href = "https://maps.app.goo.gl/UK4a2nqTon37Z2Nt7"
            break;
        case "Slovakia":
            bestdestinations.href = "https://maps.app.goo.gl/MY3chgLvSgrwgFhi9"
            break;
        case "Austria":
            bestdestinations.href = "https://maps.app.goo.gl/jMnwziXCbJnTUTX57"
            break;
        case "Czech Republic":
            bestdestinations.href = "https://maps.app.goo.gl/iw4n8CYKau5oqjXz7"
            break;
        case "Poland":
            bestdestinations.href = "https://maps.app.goo.gl/ondbBgKwouxXczn48"
            break;
        case "Netherlands":
            bestdestinations.href = "https://maps.app.goo.gl/FerRWCSmJPWNAi1MA"
            break;
        case "Belgium":
            bestdestinations.href = "https://maps.app.goo.gl/U3Dh7nyu3f49DttK6"
            break;
        case "France":
            bestdestinations.href = "https://maps.app.goo.gl/TnwtUWtx3P1dMATD9"
            break;
        default:
            break;
    }
}