const express = require("express");
const {
  searchFlights,
  getFlightById,
  createFlight,
  getCities,
  getCountries,
  getAirlines,
  getDestinations,
  getRoutes,
  updateFlightStatus,
} = require("../controllers/flightController");

const router = express.Router();

router.get("/", searchFlights);
router.get("/meta/cities", getCities);
router.get("/meta/countries", getCountries);
router.get("/meta/airlines", getAirlines);
router.get("/meta/destinations", getDestinations);
router.get("/meta/routes", getRoutes);
router.get("/:id", getFlightById);
router.post("/", createFlight);
router.put("/:id/status", updateFlightStatus);

module.exports = router;
