import { useNavigate } from "react-router-dom";
import { flightStatusInfo, formatClock } from "../utils/flightStatus";
import "../styles/FlightCard.css";

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const initialsOf = (name) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const durationText = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

// The card is styled like a boarding pass: route on the left, a tear-off stub with the
// price and the Select button on the right (it drops below the route on phones).
const FlightCard = ({ flight }) => {
  const navigate = useNavigate();
  const info = flightStatusInfo(flight);
  const cancelled = info.key === "cancelled";

  return (
    <article className={`card flight-card${cancelled ? " is-cancelled" : ""}`}>
      <div className="flight-main">
        <div className="flight-card-left">
          <div className="airline-avatar" aria-hidden="true">{initialsOf(flight.airline)}</div>
          <div className="flight-airline">
            <div className="flight-airline-name">{flight.airline}</div>
            <div className="flight-airline-code">
              {flight.flightNumber}
              <span className={`flight-class flight-class-${String(flight.travelClass).toLowerCase()}`}>{flight.travelClass}</span>
            </div>
            <span className={`status-badge status-${info.tone}`} style={{ marginTop: 6 }}>{info.label}</span>
          </div>
        </div>

        <div className="flight-card-route">
          <div className="flight-time-block">
            <div className="flight-time">
              {info.newDeparture ? <span className="flight-old-time">{formatTime(flight.departureTime)}</span> : formatTime(flight.departureTime)}
            </div>
            {info.newDeparture && <div className={`flight-delayed-time ${info.tone}`}>{formatClock(info.newDeparture)}</div>}
            <div className="flight-city">{flight.origin}</div>
            <div className="flight-country">{flight.originCountry}</div>
          </div>

          <div className="flight-line">
            <div className="flight-duration">{durationText(flight.durationMinutes)}</div>
            <div className="flight-track" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" className="flight-plane">
                <path
                  fill="currentColor"
                  d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"
                />
              </svg>
            </div>
            <div className={`flight-stops${flight.stops === 0 ? " nonstop" : ""}`}>
              {flight.stops === 0 ? "Non-stop" : `${flight.stops} stop`}
            </div>
          </div>

          <div className="flight-time-block">
            <div className="flight-time">{formatTime(flight.arrivalTime)}</div>
            <div className="flight-city">{flight.destination}</div>
            <div className="flight-country">{flight.destinationCountry}</div>
          </div>
        </div>
      </div>

      <div className="flight-stub">
        <div className="flight-price-block">
          <div className="flight-price">Rs {flight.price.toLocaleString()}</div>
          <div className="flight-price-note">per person</div>
        </div>
        <button
          className="btn btn-primary flight-select"
          disabled={cancelled}
          onClick={() => navigate(`/booking/${flight._id}`)}
        >
          {cancelled ? "Unavailable" : "Select"}
        </button>
      </div>

      {info.key !== "ontime" && (
        <div className={`flight-status-strip status-${info.tone}`} role="status">
          <span aria-hidden="true">{info.tone === "warning" ? "⛔" : "⚠️"}</span>
          <span>{info.detail}</span>
        </div>
      )}
    </article>
  );
};

export default FlightCard;
