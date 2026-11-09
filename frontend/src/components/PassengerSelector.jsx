import { useEffect, useRef, useState } from "react";

const Stepper = ({ label, sublabel, value, min, onChange }) => (
  <div className="passenger-stepper-row">
    <div>
      <div className="passenger-stepper-label">{label}</div>
      {sublabel && <div className="passenger-stepper-sublabel">{sublabel}</div>}
    </div>
    <div className="passenger-stepper-controls">
      <button
        type="button"
        className="passenger-stepper-btn"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span className="passenger-stepper-value">{value}</span>
      <button type="button" className="passenger-stepper-btn" onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  </div>
);

// Compact summary button ("2 Adults, 1 Child · Economy") that opens a small panel with
// passenger-count steppers and a travel-class toggle, closer to how real booking sites
// let you set this without cluttering the main search row with five separate fields.
const PassengerSelector = ({ adults, childCount, infants, travelClass, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalPassengers = adults + childCount + infants;
  const classLabel = travelClass || "All Classes";
  const summary = `${totalPassengers} Passenger${totalPassengers !== 1 ? "s" : ""} · ${classLabel}`;

  return (
    <div className="field passenger-selector" ref={wrapRef}>
      <label className="label">Passengers &amp; Class</label>
      <button type="button" className="input passenger-summary-btn" onClick={() => setOpen((o) => !o)}>
        {summary}
      </button>

      {open && (
        <div className="passenger-panel">
          <Stepper
            label="Adults"
            sublabel="12+ years"
            value={adults}
            min={1}
            onChange={(v) => onChange({ adults: v, childCount, infants, travelClass })}
          />
          <Stepper
            label="Children"
            sublabel="2–11 years"
            value={childCount}
            min={0}
            onChange={(v) => onChange({ adults, childCount: v, infants, travelClass })}
          />
          <Stepper
            label="Infants"
            sublabel="Under 2 years"
            value={infants}
            min={0}
            onChange={(v) => onChange({ adults, childCount, infants: v, travelClass })}
          />

          <div className="passenger-class-label">Travel Class</div>
          <div className="passenger-class-row">
            {["", "Economy", "Business", "First"].map((cls) => (
              <button
                type="button"
                key={cls || "all"}
                className={`passenger-class-btn ${travelClass === cls ? "active" : ""}`}
                onClick={() => onChange({ adults, childCount, infants, travelClass: cls })}
              >
                {cls || "All"}
              </button>
            ))}
          </div>

          <button type="button" className="btn btn-primary passenger-done-btn" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default PassengerSelector;
