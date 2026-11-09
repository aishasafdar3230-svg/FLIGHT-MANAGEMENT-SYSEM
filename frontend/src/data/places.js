// Places we fly to/from. This is the built-in list, so the dropdowns always work, even
// before the backend answers. SearchWidget also merges in whatever the server reports
// (GET /flights/meta/countries), so new routes in the database show up automatically.
export const PLACES = [
  { country: "Pakistan", code: "PK", cities: ["Multan", "Lahore", "Karachi", "Islamabad", "Peshawar", "Quetta", "Sialkot"] },
  { country: "United Arab Emirates", code: "AE", cities: ["Dubai", "Abu Dhabi", "Sharjah"] },
  { country: "Saudi Arabia", code: "SA", cities: ["Jeddah", "Riyadh", "Medina"] },
  { country: "Qatar", code: "QA", cities: ["Doha"] },
  { country: "Turkey", code: "TR", cities: ["Istanbul"] },
  { country: "United Kingdom", code: "GB", cities: ["London", "Manchester"] },
  { country: "Malaysia", code: "MY", cities: ["Kuala Lumpur"] },
  { country: "Thailand", code: "TH", cities: ["Bangkok"] },
  { country: "Canada", code: "CA", cities: ["Toronto"] },
];

const codeOf = (country) => PLACES.find((p) => p.country === country)?.code || country.slice(0, 2).toUpperCase();

// Merge the server's list into the built-in one (no duplicates).
export const mergePlaces = (serverList = []) => {
  const map = new Map(PLACES.map((p) => [p.country, new Set(p.cities)]));
  serverList.forEach(({ country, cities }) => {
    if (!map.has(country)) map.set(country, new Set());
    cities.forEach((c) => map.get(country).add(c));
  });
  return [...map.entries()]
    .map(([country, set]) => ({ country, code: codeOf(country), cities: [...set].sort() }))
    .sort((a, b) => a.country.localeCompare(b.country));
};

// The four ways to search. "from"/"to" say whether that box picks a city or a country.
export const MODES = [
  { id: "city-city", label: "City → City", from: "city", to: "city" },
  { id: "country-country", label: "Country → Country", from: "country", to: "country" },
  { id: "country-city", label: "Country → City", from: "country", to: "city" },
  { id: "city-country", label: "City → Country", from: "city", to: "country" },
];

export const modeFromTypes = (from, to) =>
  MODES.find((m) => m.from === from && m.to === to) || MODES[0];

// Narrow a places list to what is reachable from the other box.
//  - side "to":   the other box is the ORIGIN, return places you can fly TO from it
//  - side "from": the other box is the DESTINATION, return places you can fly FROM to it
// With no routes loaded, or nothing valid typed in the other box yet, the full list is returned.
export const reachablePlaces = (places, routes, side, otherKind, otherValue, kind) => {
  const v = (otherValue || "").trim().toLowerCase();
  if (!routes.length || !v) return places;
  const otherCity = side === "to" ? "origin" : "destination";
  const otherCountry = side === "to" ? "originCountry" : "destinationCountry";
  const hitCity = side === "to" ? "destination" : "origin";
  const hitCountry = side === "to" ? "destinationCountry" : "originCountry";
  const matches = routes.filter((r) => (otherKind === "city" ? r[otherCity] : r[otherCountry]).toLowerCase() === v);
  if (!matches.length) return places;
  const cities = new Set(matches.map((r) => r[hitCity].toLowerCase()));
  const countries = new Set(matches.map((r) => r[hitCountry].toLowerCase()));
  return places
    .map((p) => ({ ...p, cities: p.cities.filter((c) => cities.has(c.toLowerCase())) }))
    .filter((p) => (kind === "country" ? countries.has(p.country.toLowerCase()) : p.cities.length > 0));
};
