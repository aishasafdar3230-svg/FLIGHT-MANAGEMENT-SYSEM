import { useEffect, useMemo, useRef, useState } from "react";

// A real dropdown for a city OR a country.
//  - kind="city":    list is grouped by country, every city shows its country code.
//  - kind="country": list of countries, each showing how many cities we serve there.
// Click the box and the whole list opens; type to filter; arrow keys + Enter also work.
const PlaceSelect = ({ label, kind, value, onChange, places, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const options = useMemo(() => {
    const out = [];
    places.forEach(({ country, code, cities }) => {
      if (kind === "country") out.push({ label: country, code, sub: `${cities.length} ${cities.length === 1 ? "city" : "cities"}`, group: null });
      else cities.forEach((city) => out.push({ label: city, code, sub: country, group: country }));
    });
    return out;
  }, [places, kind]);

  const q = value.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.sub.toLowerCase().includes(q));
  }, [options, q]);

  useEffect(() => {
    const close = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (active >= 0 && listRef.current) listRef.current.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (opt) => {
    onChange(opt.label);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); }
      return;
    }
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % filtered.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? filtered.length - 1 : i - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(filtered[active]); }
    else if (e.key === "Escape") setOpen(false);
  };

  let lastGroup = null;

  return (
    <div className="field place-field" ref={wrapRef}>
      <label className="label">{label}</label>
      <div className={`place-box${open ? " open" : ""}`}>
        <span className="place-icon" aria-hidden="true">
          {kind === "country" ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
          )}
        </span>
        <input
          className="input place-input"
          type="text"
          value={value}
          placeholder={placeholder || (kind === "country" ? "Select country" : "Select city")}
          autoComplete="off"
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
        />
        <button type="button" tabIndex={-1} className="place-chevron" aria-label="Open list" onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}>
          <svg viewBox="0 0 12 8" width="12" height="8"><path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {open && (
        <ul className="place-suggestions" ref={listRef}>
          {filtered.length === 0 && <li className="place-empty">No {kind} found for “{value}”</li>}
          {filtered.map((opt, i) => {
            const header = opt.group && opt.group !== lastGroup ? opt.group : null;
            lastGroup = opt.group;
            return (
              <li key={`${opt.label}-${opt.sub}`} style={{ listStyle: "none" }}>
                {header && <div className="place-group">{header}</div>}
                <div
                  data-i={i}
                  className={`place-suggestion-item${i === active ? " active" : ""}`}
                  onMouseDown={(e) => { e.preventDefault(); pick(opt); }}
                  onMouseEnter={() => setActive(i)}
                >
                  <span className="place-code">{opt.code}</span>
                  <span className="place-suggestion-main">{opt.label}</span>
                  {kind === "country" && <span className="place-suggestion-sub">{opt.sub}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PlaceSelect;
