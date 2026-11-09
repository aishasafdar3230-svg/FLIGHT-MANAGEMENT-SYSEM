const mongoose = require("mongoose");

const flightSchema = new mongoose.Schema(
  {
    // Not unique: real flight numbers (e.g. EK607) repeat every day the flight operates —
    // we seed the same number across many departure dates, so uniqueness would break that.
    flightNumber: { type: String, required: true },
    airline: { type: String, required: true, default: "Wingspan Air" },
    origin: { type: String, required: true },
    originCountry: { type: String, required: true, default: "Pakistan" },
    destination: { type: String, required: true },
    destinationCountry: { type: String, required: true, default: "Pakistan" },
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    price: { type: Number, required: true },
    seatsAvailable: { type: Number, required: true, default: 100 },
    travelClass: {
      type: String,
      enum: ["Economy", "Business", "First"],
      default: "Economy",
    },
    stops: { type: Number, default: 0 }, // 0 = non-stop
    // Live status: On Time (green), Delayed (amber, see delayMinutes), Cancelled (red).
    status: { type: String, enum: ["On Time", "Delayed", "Cancelled"], default: "On Time" },
    delayMinutes: { type: Number, default: 0 },
    delayReason: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Flight", flightSchema);
