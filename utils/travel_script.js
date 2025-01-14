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
    d_container.classList.add("hidden");
    location.reload();
});

function visitedCountryLinks(country) {
    switch (country) {
        case "Hungary":
            myMemories.href = "/countries/hg.html"
            bestdestinations.href = "https://maps.app.goo.gl/UK4a2nqTon37Z2Nt7"
            break;
        case "Slovakia":
            myMemories.href = "/countries/sk.html"
            bestdestinations.href = "https://maps.app.goo.gl/MY3chgLvSgrwgFhi9"
            break;
        case "Austria":
            myMemories.href = "/countries/aus.html"
            bestdestinations.href = "https://maps.app.goo.gl/jMnwziXCbJnTUTX57"
            break;
        case "Czech Republic":
            myMemories.href = "/countries/czk.html"
            bestdestinations.href = "https://maps.app.goo.gl/iw4n8CYKau5oqjXz7"
            break;
        case "Poland":
            myMemories.href = "/countries/pl.html"
            bestdestinations.href = "https://maps.app.goo.gl/ondbBgKwouxXczn48"
            break;
        case "Netherlands":
            myMemories.href = "/countries/nl.html"
            bestdestinations.href = "https://maps.app.goo.gl/FerRWCSmJPWNAi1MA"
            break;
        case "Belgium":
            myMemories.href = "/countries/be.html"
            bestdestinations.href = "https://maps.app.goo.gl/U3Dh7nyu3f49DttK6"
            break;
        case "France":
            myMemories.href = "/countries/fr.html"
            bestdestinations.href = "https://maps.app.goo.gl/TnwtUWtx3P1dMATD9"
            break;
        case "Turkey":
            myMemories.href = "/countries/tr.html"
            bestdestinations.href = ""
            break;
        default:
            break;
    }
}