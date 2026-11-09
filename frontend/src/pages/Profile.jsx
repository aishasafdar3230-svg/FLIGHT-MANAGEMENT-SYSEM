import { useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const Toggle = ({ checked, onChange }) => (
  <label style={{ position: "relative", display: "inline-block", width: 42, height: 24 }}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
    <span
      style={{
        position: "absolute", cursor: "pointer", inset: 0,
        background: checked ? "var(--color-accent)" : "#cbd5e1",
        borderRadius: 24, transition: "0.2s",
      }}
    >
      <span
        style={{
          position: "absolute", height: 18, width: 18, left: checked ? 21 : 3, bottom: 3,
          background: "#fff", borderRadius: "50%", transition: "0.2s",
        }}
      />
    </span>
  </label>
);

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [darkMode, setDarkMode] = useState(user?.darkMode || false);
  const [emailNotifications, setEmailNotifications] = useState(user?.emailNotifications ?? true);
  const [promotionalEmails, setPromotionalEmails] = useState(user?.promotionalEmails ?? true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const savePreferences = async (updates) => {
    const { data } = await api.put("/auth/me", updates);
    updateUser(data);
  };

  const handleToggle = async (key, value, setter) => {
    setter(value);
    try {
      await savePreferences({ [key]: value });
    } catch (err) {
      // Revert the toggle and surface the failure -- otherwise a failed save (e.g. the
      // request drops) looks visually "on" while nothing was actually persisted.
      setter(!value);
      setError(err.response?.data?.message || "Could not save this preference. Please try again.");
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    try {
      await api.put("/auth/me", { currentPassword, newPassword });
      setMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not update password.");
    }
  };

  return (
    <div className="page-wrap container">
      <h2 className="section-title">Profile & Settings</h2>
      <p className="section-subtitle">Manage your account details and preferences.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        <div className="card" style={{ padding: 24 }}>
          <h4 style={{ marginBottom: 16 }}>Account Info</h4>
          <p style={{ marginBottom: 8 }}><strong>Name:</strong> {user?.fullName}</p>
          <p style={{ marginBottom: 8 }}><strong>Email:</strong> {user?.email}</p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h4 style={{ marginBottom: 16 }}>Change Password</h4>
          <form onSubmit={handlePasswordUpdate}>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Current Password</label>
              <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">New Password</label>
              <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Confirm New Password</label>
              <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            {error && <div className="auth-error">{error}</div>}
            {message && <div style={{ color: "var(--color-success-text)", fontSize: "0.85rem", marginBottom: 12 }}>{message}</div>}
            <button className="btn btn-primary" type="submit">Update Password</button>
          </form>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h4 style={{ marginBottom: 16 }}>Preferences</h4>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Dark Mode</div>
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Enable dark theme</div>
            </div>
            <Toggle checked={darkMode} onChange={(e) => handleToggle("darkMode", e.target.checked, setDarkMode)} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Email Notifications</div>
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Receive booking updates</div>
            </div>
            <Toggle checked={emailNotifications} onChange={(e) => handleToggle("emailNotifications", e.target.checked, setEmailNotifications)} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Promotional Emails</div>
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Offers and discounts</div>
            </div>
            <Toggle checked={promotionalEmails} onChange={(e) => handleToggle("promotionalEmails", e.target.checked, setPromotionalEmails)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
