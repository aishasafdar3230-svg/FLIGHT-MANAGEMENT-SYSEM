import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import PlaceSelect from "./PlaceSelect";
import PassengerSelector from "./PassengerSelector";
import { MODES, mergePlaces, reachablePlaces } from "../data/places";
import useRoutes from "../data/useRoutes";
import "../styles/SearchWidget.css";

// Today's date in the user's own timezone as YYYY-MM-DD.
const todayStr = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

// Find the exact spelling of what was typed among the allowed options (case-insensitive).
export const resolvePlace = (places, kind, text) => {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  for (const p of places) {
    if (kind === "country" && p.country.toLowerCase() === t) return p.country;
    if (kind === "city") {
      const hit = p.cities.find((c) => c.toLowerCase() === t);
      if (hit) return hit;
    }
  }
  return null;
};

const SearchWidget = () => {
  const navigate = useNavigate();
  const [modeId, setModeId] = useState("city-city");
  const [places, setPlaces] = useState(() => mergePlaces());
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [passengers, setPassengers] = useState({ adults: 1, childCount: 0, infants: 0, travelClass: "" });
  const [error, setError] = useState("");

  const mode = useMemo(() => MODES.find((m) => m.id === modeId), [modeId]);
  const routes = useRoutes();

  // "To" only lists places that have flights from the chosen "From" (and the other way round).
  // Country -> Country: flying "Pakistan to Pakistan" makes no sense, so the country picked in
  // one box is removed from the other box's list (this is why Pakistan kept showing up).
  const bothCountries = mode.from === "country" && mode.to === "country";
  const without = (list, name) => {
    const n = (name || "").trim().toLowerCase();
    return bothCountries && n ? list.filter((p) => p.country.toLowerCase() !== n) : list;
  };
  const toPlaces = useMemo(
    () => without(reachablePlaces(places, routes, "to", mode.from, origin, mode.to), origin),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [places, routes, mode, origin]
  );
  const fromPlaces = useMemo(
    () => without(reachablePlaces(places, routes, "from", mode.to, destination, mode.from), destination),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [places, routes, mode, destination]
  );

  // If "From" changes and the chosen "To" has no flights from there, clear it.
  useEffect(() => {
    if (destination && resolvePlace(places, mode.to, destination) && !resolvePlace(toPlaces, mode.to, destination)) {
      setDestination("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin]);

  useEffect(() => {
    api
      .get("/flights/meta/countries")
      .then(({ data }) => setPlaces(mergePlaces(data)))
      .catch(() => {}); // the built-in list is already there, so the dropdowns still work
  }, []);

  const changeMode = (id) => {
    setModeId(id);
    setOrigin("");
    setDestination("");
    setError("");
  };

  const swap = () => {
    // Only swap when both boxes are the same kind (City↔City or Country↔Country).
    if (mode.from === mode.to) {
      setOrigin(destination);
      setDestination(origin);
    } else {
      const next = MODES.find((m) => m.from === mode.to && m.to === mode.from);
      setModeId(next.id);
      setOrigin(destination);
      setDestination(origin);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const from = resolvePlace(places, mode.from, origin);
    const to = resolvePlace(places, mode.to, destination);

    if (!from) return setError(`Please choose a ${mode.from} for “From” from the list.`);
    if (!to) return setError(`Please choose a ${mode.to} for “To” from the list.`);
    if (!resolvePlace(toPlaces, mode.to, destination)) return setError(`We don't have flights from ${from} to ${to}. Pick a place from the “To” list.`);
    if (from.toLowerCase() === to.toLowerCase()) return setError("From and To can't be the same place.");
    if (!date) return setError("Please pick a departure date.");
    if (date < todayStr()) return setError("Departure date can't be in the past.");
    setError("");

    const params = new URLSearchParams({
      origin: from,
      destination: to,
      originType: mode.from,
      destinationType: mode.to,
      date,
      adults: passengers.adults,
      children: passengers.childCount,
      infants: passengers.infants,
      travelClass: passengers.travelClass,
    });
    navigate(`/flights?${params.toString()}`);
  };

  return (
    <form className="card search-widget" onSubmit={handleSearch}>
      <div className="search-heading">
        <h3>Where to next?</h3>
        <p>Search by city or by whole country.</p>
      </div>

      <div className="search-tabs" role="tablist">
        {MODES.map((m) => (
          <button
            type="button"
            role="tab"
            aria-selected={modeId === m.id}
            key={m.id}
            className={`search-tab ${modeId === m.id ? "active" : ""}`}
            onClick={() => changeMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="search-row search-row-places">
        <PlaceSelect label="From" kind={mode.from} value={origin} onChange={setOrigin} places={fromPlaces} />
        <button type="button" className="swap-btn" onClick={swap} title="Swap" aria-label="Swap From and To">
          ⇄
        </button>
        <PlaceSelect label="To" kind={mode.to} value={destination} onChange={setDestination} places={toPlaces} />
      </div>

      <div className="search-row">
        <div className="field">
          <label className="label">Departure</label>
          <input type="date" className="input" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="search-row">
        <PassengerSelector
          adults={Number(passengers.adults)}
          childCount={Number(passengers.childCount)}
          infants={Number(passengers.infants)}
          travelClass={passengers.travelClass}
          onChange={setPassengers}
        />
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 14 }}>{error}</div>}

      <button type="submit" className="btn btn-primary search-submit">
        Search Flights
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
    </form>
  );
};

export default SearchWidget;
