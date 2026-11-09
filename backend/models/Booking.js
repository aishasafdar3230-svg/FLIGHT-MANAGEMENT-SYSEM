const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    flight: { type: mongoose.Schema.Types.ObjectId, ref: "Flight", required: true },
    passengers: {
      adults: { type: Number, default: 1 },
      children: { type: Number, default: 0 },
      infants: { type: Number, default: 0 },
    },
    travelClass: {
      type: String,
      enum: ["Economy", "Business", "First"],
      default: "Economy",
    },
    pricePaid: { type: Number, required: true },
    promoCodeUsed: { type: String, default: null },
    amountSaved: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Booked", "Cancelled", "Completed"],
      default: "Booked",
    },
    // Filled in when a ticket is cancelled (by the passenger, or by the airline if the
    // flight itself is cancelled).
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, enum: ["Passenger", "Airline", null], default: null },
    refundAmount: { type: Number, default: 0 },
    cancelMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
