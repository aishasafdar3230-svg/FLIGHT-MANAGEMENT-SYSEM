import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Sends a logged-out visitor to the login page BEFORE they see whatever this route
// protects (e.g. the booking review form), instead of letting them fill it in and only
// then finding out they need an account. `state.from` remembers where they were headed
// so Login/Signup can send them straight back there once they're authenticated.
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
};

export default ProtectedRoute;
