const Flight = require("../models/Flight");
const Booking = require("../models/Booking");

// A handful of common short forms people actually type, so "UK", "UAE", "USA" etc.
// resolve to the full country name stored in the DB instead of matching nothing.
const COUNTRY_ALIASES = {
  uk: "United Kingdom",
  "u.k.": "United Kingdom",
  england: "United Kingdom",
  britain: "United Kingdom",
  uae: "United Arab Emirates",
  "u.a.e.": "United Arab Emirates",
  emirates: "United Arab Emirates",
  turkiye: "Turkey",
  pak: "Pakistan",
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Turns whatever the user typed into a case-insensitive "starts-a-word" pattern.
// "pak" -> Pakistan, "abu" -> Abu Dhabi, "dhabi" -> Abu Dhabi, "united" -> United Kingdom.
// A plain "contains" match was ambiguous: a short input like "man" also matched the middle
// of other names, and "a" matched nearly every city. Matching only at the start of a word
// (and requiring 2+ characters) keeps results predictable.
const buildLocationMatch = (raw) => {
  const trimmed = raw.trim();
  const alias = COUNTRY_ALIASES[trimmed.toLowerCase()];
  const safe = escapeRegex(alias || trimmed);
  return new RegExp(`(^|[\\s-])${safe}`, "i");
};

// When the search box says "this is a city" or "this is a country", match exactly that
// field (case-insensitive, whole name). Without a type, fall back to the flexible match
// above, which the AI assistant still uses for free text.
const locationClause = (cityField, countryField, raw, type) => {
  const trimmed = raw.trim();
  if (type === "city") return { [cityField]: new RegExp(`^${escapeRegex(trimmed)}$`, "i") };
  if (type === "country") {
    const alias = COUNTRY_ALIASES[trimmed.toLowerCase()];
    return { [countryField]: new RegExp(`^${escapeRegex(alias || trimmed)}$`, "i") };
  }
  const match = buildLocationMatch(raw);
  return { $or: [{ [cityField]: match }, { [countryField]: match }] };
};

const isValidLocation = (raw) => typeof raw === "string" && raw.trim().length >= 2;

// Flight times are stored in UTC, but a person picking "12 Dec" means 12 Dec where the
// flights depart from (Pakistan, UTC+5 by default). Using UTC midnight made early-morning
// flights show up under the PREVIOUS day. Override with SEARCH_TZ_OFFSET (e.g. "+04:00").
const SEARCH_TZ_OFFSET = process.env.SEARCH_TZ_OFFSET || "+05:00";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const dayRange = (dateStr) => {
  if (!DATE_RE.test(dateStr)) return null;
  const start = new Date(`${dateStr}T00:00:00${SEARCH_TZ_OFFSET}`);
  if (Number.isNaN(start.getTime())) return null;
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
};

// @desc  Search/list flights with filters
// @route GET /api/flights?origin=&destination=&date=&travelClass=&sortBy=&stops=&airline=
// "origin"/"destination" are free text -- each can be a city ("Multan") or a country
// ("Pakistan"); we match it against both the city and country fields so either works
// from a single plain input box, which is what actually fixes tickets not showing up.
const searchFlights = async (req, res) => {
  try {
    const { origin, destination, originType, destinationType, date, travelClass, sortBy, sortOrder, stops, airline, maxPrice, minSeats } = req.query;
    const and = [];

    if (origin && origin.trim() && !isValidLocation(origin)) {
      return res.status(400).json({ message: "Enter at least 2 letters for From." });
    }
    if (destination && destination.trim() && !isValidLocation(destination)) {
      return res.status(400).json({ message: "Enter at least 2 letters for To." });
    }

    if (origin && origin.trim()) {
      and.push(locationClause("origin", "originCountry", origin, originType));
    }

    if (destination && destination.trim()) {
      and.push(locationClause("destination", "destinationCountry", destination, destinationType));
    }

    // "airline" is a comma-separated list from the sidebar checkboxes (e.g. "PIA,Emirates"),
    // so a person can tick more than one airline at once instead of picking just one.
    if (airline && airline.trim()) {
      const names = airline
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      if (names.length) {
        and.push({ airline: { $in: names.map((n) => new RegExp(`^${escapeRegex(n)}$`, "i")) } });
      }
    }
    if (travelClass) and.push({ travelClass });
    if (stops === "non-stop") and.push({ stops: 0 });
    if (stops === "1-stop") and.push({ stops: 1 });
    if (maxPrice && !Number.isNaN(Number(maxPrice))) and.push({ price: { $lte: Number(maxPrice) } });

    // Only show flights that can seat everyone in the search.
    if (minSeats && Number(minSeats) > 0) and.push({ seatsAvailable: { $gte: Number(minSeats) } });

    if (date) {
      const range = dayRange(date);
      if (!range) return res.status(400).json({ message: "Date must look like YYYY-MM-DD." });
      and.push({ departureTime: { $gte: range.start, $lt: range.end } });
    }

    const query = and.length ? { $and: and } : {};

    // "sortOrder" flips the direction of whichever field "sortBy" picks -- without this,
    // every sort was hard-coded to ascending (1) and there was no way to view flights in
    // reverse (e.g. latest departure first, or most expensive first).
    const direction = sortOrder === "desc" ? -1 : 1;
    let sortField = "departureTime";
    if (sortBy === "price") sortField = "price";
    if (sortBy === "duration") sortField = "durationMinutes";
    if (sortBy === "departureTime") sortField = "departureTime";
    const sort = { [sortField]: direction };

    const flights = await Flight.find(query).sort(sort);
    res.json(flights);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get single flight
// @route GET /api/flights/:id
const getFlightById = async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) return res.status(404).json({ message: "Flight not found" });
    res.json(flight);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Create a flight (admin/seed use)
// @route POST /api/flights
const createFlight = async (req, res) => {
  try {
    const flight = await Flight.create(req.body);
    res.status(201).json(flight);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  List distinct cities available (for search dropdowns)
// @route GET /api/flights/meta/cities
const getCities = async (req, res) => {
  try {
    const origins = await Flight.distinct("origin");
    const destinations = await Flight.distinct("destination");
    const cities = [...new Set([...origins, ...destinations])].sort();
    res.json(cities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  List countries with the cities served in each (for the country-level search UI)
// @route GET /api/flights/meta/countries
const getCountries = async (req, res) => {
  try {
    const flights = await Flight.find({}, "origin originCountry destination destinationCountry");
    const map = {};

    flights.forEach((f) => {
      if (!map[f.originCountry]) map[f.originCountry] = new Set();
      map[f.originCountry].add(f.origin);
      if (!map[f.destinationCountry]) map[f.destinationCountry] = new Set();
      map[f.destinationCountry].add(f.destination);
    });

    const countries = Object.keys(map)
      .sort()
      .map((country) => ({ country, cities: [...map[country]].sort() }));

    res.json(countries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  List distinct airlines (for the results-page filter)
// @route GET /api/flights/meta/airlines?origin=&destination=
// When origin/destination are passed, only airlines that actually serve that route are
// returned -- otherwise the sidebar lists airlines (e.g. a domestic-only carrier) that can
// never produce a result for the current search, which looks like a broken checkbox.
const getAirlines = async (req, res) => {
  try {
    const { origin, destination, originType, destinationType } = req.query;
    const and = [];
    if (origin && origin.trim()) {
      and.push(locationClause("origin", "originCountry", origin, originType));
    }
    if (destination && destination.trim()) {
      and.push(locationClause("destination", "destinationCountry", destination, destinationType));
    }
    const query = and.length ? { $and: and } : {};
    const airlines = await Flight.distinct("airline", query);
    res.json(airlines.sort());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Where can you fly from a given place? (used by the "no flights found" suggestions)
// @route GET /api/flights/meta/destinations?origin=Multan
// Returns [{ destination, destinationCountry }] so the results page can offer real,
// clickable alternatives instead of a dead-end "0 flights found".
const getDestinations = async (req, res) => {
  try {
    const { origin, originType } = req.query;
    if (!origin || !isValidLocation(origin)) return res.json([]);
    const rows = await Flight.aggregate([
      { $match: locationClause("origin", "originCountry", origin, originType) },
      { $group: { _id: { destination: "$destination", destinationCountry: "$destinationCountry" } } },
      { $sort: { "_id.destinationCountry": 1, "_id.destination": 1 } },
    ]);
    res.json(rows.map((r) => r._id));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Every origin -> destination pair that has flights (so the search box only offers
//        places you can actually fly to from the chosen From)
// @route GET /api/flights/meta/routes
const getRoutes = async (req, res) => {
  try {
    const rows = await Flight.aggregate([
      { $group: { _id: { origin: "$origin", originCountry: "$originCountry", destination: "$destination", destinationCountry: "$destinationCountry" } } },
    ]);
    res.json(rows.map((r) => r._id));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Mark a flight On Time / Delayed / Cancelled (airline operations)
// @route PUT /api/flights/:id/status   header: x-admin-key = ADMIN_KEY from .env
// body: { status: "Delayed", delayMinutes: 90, delayReason: "Bad weather" }
// There are no admin accounts yet, so this is guarded by a secret key. If ADMIN_KEY is not
// set in .env the route stays switched off.
const updateFlightStatus = async (req, res) => {
  try {
    if (!process.env.ADMIN_KEY) {
      return res.status(403).json({ message: "Flight status updates are disabled. Set ADMIN_KEY in backend/.env." });
    }
    if (req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
      return res.status(401).json({ message: "Wrong admin key." });
    }

    const { status, delayMinutes, delayReason } = req.body;
    if (!["On Time", "Delayed", "Cancelled"].includes(status)) {
      return res.status(400).json({ message: 'status must be "On Time", "Delayed" or "Cancelled".' });
    }
    const minutes = Number(delayMinutes) || 0;
    if (status === "Delayed" && minutes <= 0) {
      return res.status(400).json({ message: "Enter delayMinutes (more than 0) for a delayed flight." });
    }

    const flight = await Flight.findById(req.params.id);
    if (!flight) return res.status(404).json({ message: "Flight not found" });

    flight.status = status;
    flight.delayMinutes = status === "Delayed" ? minutes : 0;
    flight.delayReason = status === "On Time" ? "" : String(delayReason || "").slice(0, 120);
    await flight.save();

    // A cancelled flight cancels every active ticket on it, with a full refund.
    let cancelledTickets = 0;
    if (status === "Cancelled") {
      const tickets = await Booking.find({ flight: flight._id, status: "Booked" });
      for (const t of tickets) {
        t.status = "Cancelled";
        t.cancelledAt = new Date();
        t.cancelledBy = "Airline";
        t.refundAmount = t.pricePaid;
        t.cancelMessage = "The airline cancelled this flight, so you get a full refund.";
        await t.save();
      }
      cancelledTickets = tickets.length;
    }

    res.json({ flight, cancelledTickets });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  updateFlightStatus, getRoutes, searchFlights, getFlightById, createFlight, getCities, getCountries, getAirlines, getDestinations };
