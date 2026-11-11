// load a JSON file and handle errors
async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

const site = await loadJSON("/data/site.json");
console.log(site.name);
