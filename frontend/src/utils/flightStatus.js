// Turns a flight's status fields into what the screen should show.
// tone: "normal" (green) | "caution" (amber) | "warning" (red)  -> see --status-* in index.css

export const formatClock = (date) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const delayText = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export const flightStatusInfo = (flight) => {
  const status = flight?.status || "On Time";
  const mins = flight?.delayMinutes || 0;

  if (status === "Cancelled") {
    return {
      key: "cancelled",
      tone: "warning",
      label: "Cancelled",
      detail: flight.delayReason ? `Cancelled: ${flight.delayReason}.` : "This flight has been cancelled.",
    };
  }
  if (status === "Delayed" && mins > 0) {
    const newDep = new Date(new Date(flight.departureTime).getTime() + mins * 60000);
    // 2h+ delay is shown red because the passenger is then entitled to a free refund.
    return {
      key: "delayed",
      tone: mins >= 120 ? "warning" : "caution",
      label: `Delayed ${delayText(mins)}`,
      newDeparture: newDep,
      detail: `${flight.delayReason ? flight.delayReason + ". " : ""}New departure time ${formatClock(newDep)}.${
        mins >= 120 ? " You can cancel for a full refund." : ""
      }`,
    };
  }
  return { key: "ontime", tone: "normal", label: "On Time", detail: "" };
};
