const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();
connectDB();

const app = express();

// Accept any localhost/127.0.0.1 port in dev (Vite auto-bumps the port — 5173, 5174, 5175...
// when one is already busy — so pinning CORS to a single port breaks the app for no reason).
// In production, set CLIENT_URL to your real deployed frontend origin and it's used exactly as-is.
const isLocalhostOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // same-origin / curl / server-to-server
      if (isLocalhostOrigin(origin)) return callback(null, true); // any local dev port
      const allowed = (process.env.CLIENT_URL || "")
        .split(",")
        .map((u) => u.trim().replace(/\/$/, ""))
        .filter(Boolean);
      if (allowed.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Wingspan Flight Booking API is running" });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/flights", require("./routes/flightRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
