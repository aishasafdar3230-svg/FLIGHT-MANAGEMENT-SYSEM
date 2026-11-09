import { useEffect, useState } from "react";
import api from "../api/axios";
import { flightStatusInfo } from "../utils/flightStatus";

const bookingTone = { Booked: "normal", Cancelled: "warning", Completed: "normal" };

const rs = (n) => `Rs ${Number(n || 0).toLocaleString()}`;

const TravelHistory = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null); // { tone, text } shown after a cancel
  const [dialog, setDialog] = useState(null); // { booking, quote, loading, error }
  const [busy, setBusy] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/bookings/my");
      setBookings(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Step 1: ask the server what this cancellation would refund, then show it in a dialog.
  const openCancel = async (booking) => {
    setNotice(null);
    setDialog({ booking, quote: null, loading: true, error: "" });
    try {
      const { data } = await api.get(`/bookings/${booking._id}/cancel-quote`);
      setDialog({ booking, quote: data, loading: false, error: "" });
    } catch (err) {
      setDialog({ booking, quote: null, loading: false, error: err.response?.data?.message || "Could not load refund details." });
    }
  };

  // Step 2: the passenger confirms; show the result message on the page.
  const confirmCancel = async () => {
    setBusy(true);
    try {
      const { data } = await api.put(`/bookings/${dialog.booking._id}/cancel`);
      setNotice({ tone: data.refundAmount > 0 ? "normal" : "caution", text: data.message });
      setDialog(null);
      fetchBookings();
    } catch (err) {
      setDialog((d) => ({ ...d, error: err.response?.data?.message || "Cancellation failed. Please try again." }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-wrap container">
      <h2 className="section-title">My Travel History</h2>
      <p className="section-subtitle">All your bookings in one place.</p>

      {notice && (
        <div className={`status-banner status-${notice.tone}`} style={{ marginBottom: 16 }} role="status">
          <span className="status-icon" aria-hidden="true">{notice.tone === "normal" ? "✅" : "ℹ️"}</span>
          <span>
            <strong>Ticket cancelled</strong>
            {notice.text}
          </span>
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ padding: 30, textAlign: "center" }}>No bookings yet — go search for a flight!</div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-navy)", color: "#fff", textAlign: "left" }}>
                <th style={{ padding: 12 }}>Flight Details</th>
                <th style={{ padding: 12 }}>Route</th>
                <th style={{ padding: 12 }}>Date & Time</th>
                <th style={{ padding: 12 }}>Price Paid</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const flight = b.flight;
                const info = flight ? flightStatusInfo(flight) : null;
                const showFlightAlert = b.status === "Booked" && info && info.key !== "ontime";
                return (
                  <tr key={b._id} style={{ borderBottom: "1px solid var(--color-border)", verticalAlign: "top" }}>
                    <td style={{ padding: 12 }}>
                      {!flight ? (
                        <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>Flight details unavailable</span>
                      ) : (
                        <>
                          <strong>{flight.airline}</strong>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{flight.flightNumber}</div>
                        </>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>{!flight ? "—" : `${flight.origin} → ${flight.destination}`}</td>
                    <td style={{ padding: 12 }}>
                      {!flight ? (
                        "—"
                      ) : (
                        <>
                          {new Date(flight.departureTime).toLocaleDateString()}
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            {new Date(flight.departureTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </>
                      )}
                    </td>
                    <td style={{ padding: 12, fontWeight: 700 }}>
                      {rs(b.pricePaid)}
                      {b.status === "Cancelled" && (
                        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: b.refundAmount > 0 ? "var(--status-normal-text)" : "var(--color-text-muted)" }}>
                          {b.refundAmount > 0 ? `${rs(b.refundAmount)} refund` : "No refund"}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                        <span className={`status-badge status-${bookingTone[b.status] || "normal"}`}>{b.status}</span>
                        {showFlightAlert && <span className={`status-badge status-${info.tone}`}>Flight {info.label.toLowerCase()}</span>}
                        {b.status === "Cancelled" && b.cancelledBy === "Airline" && (
                          <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", maxWidth: 190 }}>Cancelled by the airline</span>
                        )}
                      </div>
                      {showFlightAlert && (
                        <div style={{ fontSize: "0.74rem", color: "var(--color-text-muted)", marginTop: 6, maxWidth: 220 }}>{info.detail}</div>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      {b.status === "Booked" && (
                        <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: "0.75rem" }} onClick={() => openCancel(b)}>
                          Cancel ticket
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialog && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && setDialog(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
            <h3 id="cancel-title">Cancel this ticket?</h3>
            {dialog.booking.flight && (
              <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                {dialog.booking.flight.flightNumber} · {dialog.booking.flight.origin} → {dialog.booking.flight.destination},{" "}
                {new Date(dialog.booking.flight.departureTime).toLocaleDateString()}
              </p>
            )}

            {dialog.loading && <p style={{ marginTop: 14 }}>Checking refund…</p>}

            {dialog.quote && (
              <>
                <div className={`status-banner status-${dialog.quote.airlineFault ? "normal" : dialog.quote.refundPercent === 0 ? "warning" : "caution"}`} style={{ marginTop: 14 }}>
                  <span>{dialog.quote.reason}</span>
                </div>
                {dialog.quote.canCancel && (
                  <div className="refund-box">
                    <div className="refund-row"><span>Amount paid</span><span>{rs(dialog.booking.pricePaid)}</span></div>
                    <div className="refund-row"><span>Cancellation fee</span><span>− {rs(dialog.quote.fee)}</span></div>
                    <div className="refund-row total"><span>You get back</span><span>{rs(dialog.quote.refundAmount)}</span></div>
                  </div>
                )}
              </>
            )}

            {dialog.error && <div className="auth-error" style={{ marginTop: 12 }}>{dialog.error}</div>}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDialog(null)} disabled={busy}>Keep ticket</button>
              {dialog.quote?.canCancel && (
                <button className="btn btn-danger" onClick={confirmCancel} disabled={busy}>
                  {busy ? "Cancelling…" : "Yes, cancel ticket"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelHistory;
