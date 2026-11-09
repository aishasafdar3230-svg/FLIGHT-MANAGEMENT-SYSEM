import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AIAssistant from "./components/AIAssistant";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import FlightResults from "./pages/FlightResults";
import BookingReview from "./pages/BookingReview";
import Confirmation from "./pages/Confirmation";
import TravelHistory from "./pages/TravelHistory";
import Profile from "./pages/Profile";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/flights" element={<FlightResults />} />
        <Route
          path="/booking/:flightId"
          element={
            <ProtectedRoute>
              <BookingReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/confirmation/:bookingId"
          element={
            <ProtectedRoute>
              <Confirmation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <TravelHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
      <Footer />
      <AIAssistant />
    </>
  );
}

export default App;
