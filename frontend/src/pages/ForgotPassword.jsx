import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "../styles/Auth.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrap auth-wrap">
      <div className="card auth-card">
        <h2>Forgot Password?</h2>
        <p className="sub">Enter your email and we'll send you a link to reset your password.</p>

        {error && <div className="auth-error">{error}</div>}

        {sent ? (
          <div className="auth-success">
            If an account exists for <strong>{email}</strong>, a reset link has been sent. Check your inbox (and spam
            folder). The link is valid for 30 minutes.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="label">Email Address</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <div className="auth-switch">
          Remembered it? <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
