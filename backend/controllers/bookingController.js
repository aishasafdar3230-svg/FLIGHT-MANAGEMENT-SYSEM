const Booking = require("../models/Booking");
const Flight = require("../models/Flight");

const PROMO_CODES = {
  SUMMER20: 0.2,
  WELCOME10: 0.1,
  FLAT1000: 1000, // flat rupees off
  EARLYBIRD: 0.15,
};

const HOUR = 60 * 60 * 1000;

// One place that decides what a passenger gets back when they cancel. The cancel-quote
// route shows it BEFORE they confirm and the cancel route uses the very same numbers.
const buildCancelQuote = (booking, flight, now = new Date()) => {
  if (booking.status === "Cancelled") {
    return { canCancel: false, refundPercent: 0, refundAmount: 0, fee: 0, reason: "This ticket is already cancelled." };
  }
  if (booking.status === "Completed") {
    return { canCancel: false, refundPercent: 0, refundAmount: 0, fee: 0, reason: "This trip is already completed." };
  }
  if (!flight) {
    return { canCancel: true, refundPercent: 0, refundAmount: 0, fee: booking.pricePaid, reason: "Flight details are unavailable, so no refund can be calculated." };
  }

  const paid = booking.pricePaid || 0;
  const hoursLeft = (new Date(flight.departureTime).getTime() - now.getTime()) / HOUR;

  // The airline cancelled or delayed badly: the passenger always gets everything back.
  if (flight.status === "Cancelled") {
    return { canCancel: true, refundPercent: 100, refundAmount: paid, fee: 0, airlineFault: true, reason: "The airline cancelled this flight, so you get a full refund." };
  }
  if (flight.status === "Delayed" && flight.delayMinutes >= 120) {
    return { canCancel: true, refundPercent: 100, refundAmount: paid, fee: 0, airlineFault: true, reason: `This flight is delayed by ${flight.delayMinutes} minutes, so you get a full refund.` };
  }

  if (hoursLeft <= 0) {
    return { canCancel: false, refundPercent: 0, refundAmount: 0, fee: 0, reason: "This flight has already departed, so it can't be cancelled." };
  }

  let refundPercent = 0;
  let reason = "Cancelling within 24 hours of departure: no refund.";
  if (hoursLeft >= 48) {
    refundPercent = 90;
    reason = "Cancelling 48+ hours before departure: 90% refund (10% cancellation fee).";
  } else if (hoursLeft >= 24) {
    refundPercent = 50;
    reason = "Cancelling 24-48 hours before departure: 50% refund.";
  }
  const refundAmount = Math.round((paid * refundPercent) / 100);
  return { canCancel: true, refundPercent, refundAmount, fee: paid - refundAmount, reason };
};

const passengerCount = (booking) =>
  (booking.passengers?.adults || 1) + (booking.passengers?.children || 0) + (booking.passengers?.infants || 0);

// @desc  Create a booking
// @route POST /api/bookings
const createBooking = async (req, res) => {
  try {
    const { flightId, passengers, travelClass, promoCode } = req.body;

    const flight = await Flight.findById(flightId);
    if (!flight) return res.status(404).json({ message: "Flight not found" });

    const totalPassengers =
      (passengers?.adults || 1) + (passengers?.children || 0) + (passengers?.infants || 0);

    if (flight.status === "Cancelled") {
      return res.status(400).json({ message: "This flight has been cancelled. Please choose another flight." });
    }
    if (new Date(flight.departureTime) <= new Date()) {
      return res.status(400).json({ message: "This flight has already departed." });
    }

    if (flight.seatsAvailable < totalPassengers) {
      return res.status(400).json({ message: "Not enough seats available" });
    }

    let basePrice = flight.price * totalPassengers;
    let amountSaved = 0;

    if (promoCode && PROMO_CODES[promoCode.toUpperCase()]) {
      const discount = PROMO_CODES[promoCode.toUpperCase()];
      if (discount < 1) {
        amountSaved = Math.round(basePrice * discount);
      } else {
        amountSaved = discount;
      }
    }

    const pricePaid = Math.max(basePrice - amountSaved, 0);

    const booking = await Booking.create({
      user: req.user._id,
      flight: flight._id,
      passengers,
      travelClass: travelClass || flight.travelClass,
      pricePaid,
      promoCodeUsed: promoCode || null,
      amountSaved,
    });

    flight.seatsAvailable -= totalPassengers;
    await flight.save();

    const populated = await booking.populate("flight");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get logged-in user's travel history
// @route GET /api/bookings/my
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("flight")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Show what a cancellation would refund, before the passenger confirms
// @route GET /api/bookings/:id/cancel-quote
const getCancelQuote = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id }).populate("flight");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(buildCancelQuote(booking, booking.flight));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Cancel a booking
// @route PUT /api/bookings/:id/cancel
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id }).populate("flight");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const quote = buildCancelQuote(booking, booking.flight);
    if (!quote.canCancel) return res.status(400).json({ message: quote.reason });

    booking.status = "Cancelled";
    booking.cancelledAt = new Date();
    booking.cancelledBy = quote.airlineFault ? "Airline" : "Passenger";
    booking.refundAmount = quote.refundAmount;
    booking.cancelMessage = quote.reason;
    await booking.save();

    // Give the seats back so other passengers can book them.
    if (booking.flight) {
      await Flight.updateOne({ _id: booking.flight._id }, { $inc: { seatsAvailable: passengerCount(booking) } });
    }

    const message =
      quote.refundAmount > 0
        ? `Your ticket has been cancelled. Rs ${quote.refundAmount.toLocaleString()} will be refunded to your original payment method in 5-7 working days.`
        : "Your ticket has been cancelled. No refund applies to this booking.";

    res.json({ booking, refundAmount: quote.refundAmount, message });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createBooking, getMyBookings, getCancelQuote, cancelBooking, buildCancelQuote, PROMO_CODES };
