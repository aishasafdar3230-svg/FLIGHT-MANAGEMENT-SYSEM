import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import "../styles/AIAssistant.css";

// Known cities/countries the assistant recognizes in free-text messages, mapped to
// how they should be queried against the flights API.
const CITY_KEYWORDS = ["multan", "lahore", "karachi", "islamabad", "dubai", "london", "istanbul"];
const COUNTRY_KEYWORDS = {
  pakistan: "Pakistan",
  "united arab emirates": "United Arab Emirates",
  uae: "United Arab Emirates",
  "united kingdom": "United Kingdom",
  uk: "United Kingdom",
  turkey: "Turkey",
  türkiye: "Turkey",
};

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Figures out which destination the user is asking about, city first then country,
// so "flights to Dubai" and "flights to UAE" both work. The backend now matches a single
// "destination" value against both the city and country fields, so either kind of match
// can just be sent as plain text -- no separate country param needed.
const detectDestination = (text) => {
  const lower = text.toLowerCase();
  const city = CITY_KEYWORDS.find((c) => lower.includes(c));
  if (city) return capitalize(city);

  const countryKey = Object.keys(COUNTRY_KEYWORDS).find((c) => lower.includes(c));
  if (countryKey) return COUNTRY_KEYWORDS[countryKey];

  return null;
};

const formatDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

// Pulls real, live flights from the backend and formats them as a short readable list —
// same idea as asking "flights to Dubai" and getting back actual routes/prices, not a canned line.
const fetchFlightSuggestions = async (destination) => {
  const { data } = await api.get("/flights", { params: { destination, sortBy: "price" } });
  return data;
};

const buildFlightsReply = (flights, label) => {
  if (!flights.length) {
    return `I couldn't find any flights to ${label} right now. Try the Flights page and adjust your dates — new routes open up often.`;
  }
  const shown = flights.slice(0, 4);
  const lines = shown.map(
    (f) => `✈️ ${f.airline} ${f.flightNumber}: ${f.origin} → ${f.destination} · Rs ${f.price.toLocaleString()} · ${formatDate(f.departureTime)}`
  );
  const more = flights.length > shown.length ? `\nFound ${flights.length} flights! Open the Flights page to see all of them.` : "";
  return `Here's what's available to ${label}:\n${lines.join("\n")}${more}`;
};

const QUICK_ACTIONS = [
  { label: "🔍 Search Flights", prompt: "Help me search flights" },
  { label: "🏷️ Get Discounts", prompt: "Any discounts or promo codes available?" },
  { label: "📋 Booking Status", prompt: "What's my booking status?" },
  { label: "🧭 Flights to Dubai", prompt: "Show me flights to Dubai" },
];

const AIAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! I'm your Wingspan Trip Assistant ✈️ — ask me things like \"flights to Dubai\" or \"flights to UK\" and I'll pull real options for you. Tap the mic to talk to me!" },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setListening(false);
        handleSend(transcript);
      };
      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, thinking]);

  // Lets the navbar "Trip Assistant" pill open this same panel without prop drilling.
  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener("wingspan:open-assistant", openPanel);
    return () => window.removeEventListener("wingspan:open-assistant", openPanel);
  }, []);

  const speak = (text) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text.replace(/✈️|\n/g, " "));
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Rule-based first, but flight-destination questions go to the real API so the assistant
  // can list several genuine, current flights instead of one scripted sentence.
  const generateReply = async (input) => {
    const text = input.toLowerCase();

    const destination = detectDestination(text);
    if (destination && (text.includes("flight") || text.includes("fly") || text.includes("to "))) {
      try {
        const flights = await fetchFlightSuggestions(destination);
        return buildFlightsReply(flights, destination);
      } catch (err) {
        console.error(err);
        return "I couldn't reach live flight data just now — please try the Flights page directly.";
      }
    }

    if (text.includes("discount") || text.includes("promo") || text.includes("code")) {
      return "Here are our current promo codes: WELCOME10 (10% off first booking), SUMMER20 (20% off), FLAT1000 (Rs 1000 off), EARLYBIRD (15% off if you book 30+ days early). Apply them at checkout!";
    }
    if (text.includes("status") || text.includes("booking")) {
      return "You can check all your bookings anytime in 'My Trips' from the top menu — it shows route, date, price paid and status.";
    }
    if (text.includes("cheap") || text.includes("cheapest") || text.includes("price")) {
      return "To find the cheapest flights, search your route on the Flights page and sort by 'Price'. Booking early and using a promo code usually saves the most.";
    }
    if (text.includes("cancel")) {
      return "You can cancel an upcoming trip from 'My Trips' — open the booking and use the Cancel option.";
    }
    if (text.includes("hi") || text.includes("hello") || text.includes("salam") || text.includes("assalam")) {
      return "Hey there! 👋 I'm your Wingspan travel assistant. Ask me about flights (try a city or country name), discounts, or your booking status.";
    }
    return "I can help you search flights, find discounts, check booking status, or plan your trip. Try asking something like \"flights to Dubai\" or \"any discounts available?\".";
  };

  const handleSend = async (overrideText) => {
    const messageText = (overrideText ?? input).trim();
    if (!messageText) return;

    setMessages((prev) => [...prev, { from: "user", text: messageText }]);
    setInput("");
    setThinking(true);

    const reply = await generateReply(messageText);

    setThinking(false);
    setMessages((prev) => [...prev, { from: "bot", text: reply }]);
    speak(reply);
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Voice input isn't supported in this browser. Try Chrome on desktop or Android.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  return (
    <>
      <button className="ai-fab" onClick={() => setOpen((v) => !v)} title="Wingspan Trip Assistant">
        {open ? (
          "✕"
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 3.5c-4.7 0-8.5 3.36-8.5 7.5 0 2.4 1.27 4.55 3.26 5.95-.1.98-.42 2.02-1.1 3 1.53-.16 2.72-.72 3.63-1.36.86.26 1.78.41 2.71.41 4.7 0 8.5-3.36 8.5-7.5s-3.8-7.5-8.5-7.5Z"
              fill="currentColor"
            />
            <path d="M8.7 12.8 12 8l1 3.2 3.3.5-2.6 2-1.3 3.1-.9-3.3-3-.5 1.2-.9Z" fill="var(--color-navy)" />
          </svg>
        )}
      </button>

      {open && (
        <div className="ai-panel">
          <div className="ai-panel-header">
            <div>
              Trip Assistant
              <small>Wingspan's own travel helper</small>
            </div>
          </div>

          <div className="ai-quick-actions">
            {QUICK_ACTIONS.map((qa) => (
              <button key={qa.label} className="ai-quick-btn" onClick={() => handleSend(qa.prompt)}>
                {qa.label}
              </button>
            ))}
          </div>

          <div className="ai-messages">
            {messages.map((m, i) => (
              <div key={i} className={`ai-bubble ${m.from}`} style={{ whiteSpace: "pre-line" }}>
                {m.text}
              </div>
            ))}
            {thinking && (
              <div className="ai-bubble bot" style={{ fontStyle: "italic", color: "var(--color-text-muted)" }}>
                Checking live flights…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-input-row">
            <button
              className={`ai-icon-btn ${listening ? "mic-active" : ""}`}
              onClick={toggleMic}
              title="Speak your question"
              type="button"
            >
              🎙️
            </button>
            <input
              type="text"
              placeholder={listening ? "Listening..." : "Type your message or use the mic..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button className="ai-icon-btn send" onClick={() => handleSend()} title="Send" type="button">
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
