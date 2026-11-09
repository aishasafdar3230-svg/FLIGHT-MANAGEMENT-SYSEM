const express = require("express");
const { createBooking, getMyBookings, getCancelQuote, cancelBooking } = require("../controllers/bookingController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createBooking);
router.get("/my", protect, getMyBookings);
router.get("/:id/cancel-quote", protect, getCancelQuote);
router.put("/:id/cancel", protect, cancelBooking);

module.exports = router;
