import { Link, useLocation, useParams } from "react-router-dom";

const Confirmation = () => {
  const { state } = useLocation();
  const { bookingId } = useParams();
  const booking = state?.booking;

  return (
    <div className="page-wrap container" style={{ maxWidth: 520, textAlign: "center" }}>
      <div className="card" style={{ padding: 40 }}>
        <div style={{ fontSize: "3rem", marginBottom: 10 }}>✅</div>
        <h2 className="section-title">Flight Booked!</h2>
        {booking ? (
          <>
            <p className="section-subtitle">
              You saved Rs {booking.amountSaved?.toLocaleString() || 0}! Your booking reference is{" "}
              <strong>{booking._id?.slice(-8).toUpperCase()}</strong>.
            </p>
            <div style={{ textAlign: "left", background: "var(--color-bg)", padding: 16, borderRadius: 10, marginBottom: 20 }}>
              <p><strong>Route:</strong> {booking.flight?.origin} → {booking.flight?.destination}</p>
              <p><strong>Date:</strong> {new Date(booking.flight?.departureTime).toLocaleString()}</p>
              <p><strong>Price Paid:</strong> Rs {booking.pricePaid?.toLocaleString()}</p>
              <p><strong>Status:</strong> {booking.status}</p>
            </div>
          </>
        ) : (
          <p className="section-subtitle">Booking ID: {bookingId}</p>
        )}
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: 18 }}>
          Need to change plans? You can cancel from My Trips. We will show the refund amount before you confirm.
        </p>
        <Link to="/history" className="btn btn-primary" style={{ marginRight: 10 }}>View My Trips</Link>
        <Link to="/" className="btn btn-outline">Back Home</Link>
      </div>
    </div>
  );
};

export default Confirmation;
