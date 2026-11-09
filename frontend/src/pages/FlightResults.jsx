import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import FlightCard from "../components/FlightCard";
import PlaceSelect from "../components/PlaceSelect";
import { MODES, mergePlaces, modeFromTypes, reachablePlaces } from "../data/places";
import useRoutes from "../data/useRoutes";
import { resolvePlace } from "../components/SearchWidget";
import "../styles/FlightResults.css";

// Must stay at/above the highest fare in the seed data (Business/First on long-haul
// routes can reach ~520,000) -- otherwise those flights are silently excluded from
// every search by default, even before the user ever touches the slider.
const MAX_PRICE_CEILING = 600000;

// "2026-11-12" -> "Thu, 12 Nov 2026". Built from the parts (not new Date("2026-11-12"))
// because that string is parsed as UTC and can show up as the previous day in some timezones.
const prettyDate = (str) => {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return "";
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Move a YYYY-MM-DD string by N days without any timezone drift.
const shiftDate = (str, days) => {
  const [y, m, d] = str.split("-").map(Number);
  const next = new Date(y, m - 1, d + days);
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const dd = String(next.getDate()).padStart(2, "0");
  return `${next.getFullYear()}-${mm}-${dd}`;
};

const FlightResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const travelClassParam = searchParams.get("travelClass") || "";

  // The search that is actually being shown comes straight from the URL. Typing in the
  // "Update search" boxes only changes a draft; the search runs when the button is pressed.
  const origin = searchParams.get("origin") || "";
  const destination = searchParams.get("destination") || "";
  const originType = searchParams.get("originType") || "";
  const destinationType = searchParams.get("destinationType") || "";
  const date = searchParams.get("date") || "";
  const adults = Number(searchParams.get("adults") || 1);
  const kids = Number(searchParams.get("children") || 0);
  const infants = Number(searchParams.get("infants") || 0);
  const totalPassengers = Math.max(adults + kids + infants, 1);

  const [places, setPlaces] = useState(() => mergePlaces());
  const [flights, setFlights] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const [sortBy, setSortBy] = useState("departureTime");
  const [sortOrder, setSortOrder] = useState("asc");
  const [stops, setStops] = useState("");
  const [selectedAirlines, setSelectedAirlines] = useState([]);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE_CEILING);
  const [travelClass, setTravelClass] = useState(travelClassParam);
  const [filtersOpen, setFiltersOpen] = useState(false); // phones only: filters are collapsed

  // Draft values for the "Modify search" form.
  const [draft, setDraft] = useState({ origin, destination, date, modeId: modeFromTypes(originType || "city", destinationType || "city").id });
  const [formError, setFormError] = useState("");

  // New search from the URL (e.g. via Modify search or the assistant) -> reset the form
  // and the filters that belong to the old search.
  useEffect(() => {
    setDraft({ origin, destination, date, modeId: modeFromTypes(originType || "city", destinationType || "city").id });
    setFormError("");
    setTravelClass(travelClassParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, originType, destinationType, date, travelClassParam]);

  useEffect(() => {
    api
      .get("/flights/meta/countries")
      .then(({ data }) => setPlaces(mergePlaces(data)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get("/flights/meta/airlines", { params: { origin, destination, originType, destinationType } })
      .then(({ data }) => setAirlines(data))
      .catch((err) => console.error(err));
    setSelectedAirlines([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, originType, destinationType]);

  useEffect(() => {
    // "cancelled" stops an older, slower response from overwriting a newer one.
    let cancelled = false;
    const fetchFlights = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const params = {
          origin,
          destination,
          originType,
          destinationType,
          date,
          sortBy,
          sortOrder,
          stops,
          airline: selectedAirlines.join(","),
          travelClass,
          maxPrice,
          minSeats: totalPassengers,
        };
        const { data } = await api.get("/flights", { params });
        if (cancelled) return;
        setFlights(data);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        // Clear old results so a failed search never shows the previous search's flights.
        setFlights([]);
        setLoadError(
          err.response?.data?.message ||
            "Couldn't reach the server. Start the backend (cd backend, then npm run dev) and make sure MongoDB is connected, then press Try again."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchFlights();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, originType, destinationType, date, sortBy, sortOrder, stops, selectedAirlines, travelClass, maxPrice, retryKey]);

  const activeFilterCount =
    selectedAirlines.length + (maxPrice < MAX_PRICE_CEILING ? 1 : 0) + (stops ? 1 : 0) + (travelClass ? 1 : 0);

  // When nothing matches, offer real places you CAN fly to from the origin.
  useEffect(() => {
    if (loading || loadError || flights.length > 0 || !origin) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    api
      .get("/flights/meta/destinations", { params: { origin, originType } })
      .then(({ data }) => {
        if (!cancelled) setSuggestions(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loading, loadError, flights.length, origin, originType]);

  // Re-run the search with some values changed, keeping passengers/trip type intact.
  const goTo = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => next.set(key, value));
    navigate(`/flights?${next.toString()}`);
  };

  const draftMode = MODES.find((m) => m.id === draft.modeId) || MODES[0];
  const routes = useRoutes();
  const toPlaces = reachablePlaces(places, routes, "to", draftMode.from, draft.origin, draftMode.to);
  const fromPlaces = reachablePlaces(places, routes, "from", draftMode.to, draft.destination, draftMode.from);

  const handleModifySearch = (e) => {
    e.preventDefault();
    const from = resolvePlace(places, draftMode.from, draft.origin);
    const to = resolvePlace(places, draftMode.to, draft.destination);
    if (!from) return setFormError(`Please choose a ${draftMode.from} for From from the list.`);
    if (!to) return setFormError(`Please choose a ${draftMode.to} for To from the list.`);
    if (from.toLowerCase() === to.toLowerCase()) return setFormError("From and To can't be the same place.");
    setFormError("");
    goTo({ origin: from, destination: to, originType: draftMode.from, destinationType: draftMode.to, date: draft.date });
  };

  const toggleAirline = (name) => {
    setSelectedAirlines((prev) => (prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]));
  };

  const clearFilters = () => {
    setSelectedAirlines([]);
    setMaxPrice(MAX_PRICE_CEILING);
    setStops("");
    setTravelClass("");
  };

  const passengerText = `${totalPassengers} passenger${totalPassengers > 1 ? "s" : ""}`;

  return (
    <div className="page-wrap container">
      <header className="results-head">
        <h2 className="results-title">
          {origin && destination ? (
            <>
              {origin} <span className="results-arrow">→</span> {destination}
            </>
          ) : (
            "All flights"
          )}
        </h2>
        <p className="results-meta">
          {[prettyDate(date), passengerText]
            .filter(Boolean)
            .join(" · ")}
          {!loading && !loadError ? (
            <span className="results-count">
              {flights.length} flight{flights.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </p>
      </header>

      <form className="card modify-search-bar" onSubmit={handleModifySearch}>
        <div className="modify-modes">
          {MODES.map((m) => (
            <button
              type="button"
              key={m.id}
              className={`modify-mode${draft.modeId === m.id ? " active" : ""}`}
              onClick={() => setDraft({ ...draft, modeId: m.id, origin: "", destination: "" })}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="modify-search-field">
          <PlaceSelect label="From" kind={draftMode.from} value={draft.origin} onChange={(v) => setDraft((d) => ({ ...d, origin: v }))} places={fromPlaces} />
        </div>
        <div className="modify-search-field">
          <PlaceSelect label="To" kind={draftMode.to} value={draft.destination} onChange={(v) => setDraft((d) => ({ ...d, destination: v }))} places={toPlaces} />
        </div>
        <div className="modify-search-field modify-search-field-date">
          <label className="label" htmlFor="ms-date">Departure</label>
          <input
            id="ms-date"
            type="date"
            className="input"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          />
        </div>
        <button type="submit" className="btn btn-primary modify-search-submit">
          Update search
        </button>
        {formError && <div className="auth-error modify-search-error">{formError}</div>}
      </form>

      <button
        type="button"
        className="btn btn-outline filters-toggle"
        aria-expanded={filtersOpen}
        onClick={() => setFiltersOpen((v) => !v)}
      >
        {filtersOpen ? "Hide filters" : "Filters & sort"}
        {activeFilterCount > 0 && <span className="filters-badge">{activeFilterCount}</span>}
      </button>

      <div className="results-layout">
        <aside className={`card filter-sidebar${filtersOpen ? " open" : ""}`}>
          <div className="filter-group">
            <h4 className="filter-group-title">Airlines</h4>
            {airlines.length === 0 && <p className="filter-empty">No airlines for this route</p>}
            {airlines.map((a) => (
              <label className="filter-checkbox-row" key={a}>
                <input type="checkbox" checked={selectedAirlines.includes(a)} onChange={() => toggleAirline(a)} />
                <span>{a}</span>
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h4 className="filter-group-title">Max price</h4>
            <input
              type="range"
              className="price-slider"
              min="10000"
              max={MAX_PRICE_CEILING}
              step="5000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              aria-label="Maximum price"
            />
            <div className="price-slider-value">Up to Rs {Number(maxPrice).toLocaleString()}</div>
          </div>

          <div className="filter-group">
            <h4 className="filter-group-title">Class</h4>
            <select className="input" value={travelClass} onChange={(e) => setTravelClass(e.target.value)}>
              <option value="">All classes</option>
              <option value="Economy">Economy</option>
              <option value="Business">Business</option>
              <option value="First">First</option>
            </select>
          </div>

          <div className="filter-group">
            <h4 className="filter-group-title">Stops</h4>
            <select className="input" value={stops} onChange={(e) => setStops(e.target.value)}>
              <option value="">Any number</option>
              <option value="non-stop">Non-stop</option>
              <option value="1-stop">1 stop</option>
            </select>
          </div>

          <button type="button" className="btn btn-outline filter-clear" onClick={clearFilters} disabled={activeFilterCount === 0}>
            Clear filters
          </button>
        </aside>

        <div className="results-main">
          <div className="results-toolbar">
            <select className="input sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort flights by">
              <option value="departureTime">Sort by departure</option>
              <option value="price">Sort by price</option>
              <option value="duration">Sort by duration</option>
            </select>
            <button
              type="button"
              className="btn btn-outline sort-order-btn"
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              title={sortOrder === "asc" ? "Low to high. Click to reverse" : "High to low. Click to reverse"}
            >
              {sortOrder === "asc" ? "↑ Low to high" : "↓ High to low"}
            </button>
          </div>

          {loading ? (
            <div className="results-skeleton" aria-busy="true" aria-label="Loading flights">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          ) : loadError ? (
            <div className="empty-state empty-state-error">
              <h4>Flights couldn't load</h4>
              <p>{loadError}</p>
              <button type="button" className="btn btn-primary" onClick={() => setRetryKey((k) => k + 1)}>
                Try again
              </button>
            </div>
          ) : flights.length === 0 ? (
            <div className="empty-state">
              <h4>No flights match this search</h4>
              <p>
                {activeFilterCount > 0
                  ? "Your filters may be hiding results. Clear them, or try another day."
                  : `We don't have flights from ${origin || "there"} to ${destination || "there"} on this date.`}
              </p>
              <div className="empty-actions">
                {activeFilterCount > 0 && (
                  <button type="button" className="btn btn-primary" onClick={clearFilters}>
                    Clear filters
                  </button>
                )}
                {date && (
                  <>
                    <button type="button" className="btn btn-outline" onClick={() => goTo({ date: shiftDate(date, -1) })}>
                      Previous day
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => goTo({ date: shiftDate(date, 1) })}>
                      Next day
                    </button>
                  </>
                )}
              </div>

              {suggestions.length > 0 && (
                <div className="suggestions">
                  <p className="suggestions-title">Flying from {origin}? These places have flights:</p>
                  <div className="suggestion-chips">
                    {suggestions.map((s) => (
                      <button
                        type="button"
                        key={`${s.destination}-${s.destinationCountry}`}
                        className="suggestion-chip"
                        onClick={() => goTo({ destination: s.destination, destinationType: "city" })}
                      >
                        {s.destination}
                        <small>{s.destinationCountry}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            flights.map((flight) => <FlightCard key={flight._id} flight={flight} />)
          )}

        </div>
      </div>
    </div>
  );
};

export default FlightResults;
