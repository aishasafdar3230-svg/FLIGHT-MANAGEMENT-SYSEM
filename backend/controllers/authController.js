const User = require("../models/User");
const crypto = require("crypto");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

// @desc  Register new user
// @route POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({ fullName, email, password });

    res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      darkMode: user.darkMode,
      emailNotifications: user.emailNotifications,
      promotionalEmails: user.promotionalEmails,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Login user
// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        darkMode: user.darkMode,
        emailNotifications: user.emailNotifications,
        promotionalEmails: user.promotionalEmails,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get current logged-in user profile
// @route GET /api/auth/me
const getMe = async (req, res) => {
  res.json(req.user);
};

// @desc  Update profile settings (dark mode, notifications, password)
// @route PUT /api/auth/me
const updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { fullName, darkMode, emailNotifications, promotionalEmails, currentPassword, newPassword } = req.body;

    if (fullName) user.fullName = fullName;
    if (typeof darkMode === "boolean") user.darkMode = darkMode;
    if (typeof emailNotifications === "boolean") user.emailNotifications = emailNotifications;
    if (typeof promotionalEmails === "boolean") user.promotionalEmails = promotionalEmails;

    if (newPassword) {
      if (!currentPassword || !(await user.matchPassword(currentPassword))) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      user.password = newPassword;
    }

    const updated = await user.save();
    res.json({
      _id: updated._id,
      fullName: updated.fullName,
      email: updated.email,
      darkMode: updated.darkMode,
      emailNotifications: updated.emailNotifications,
      promotionalEmails: updated.promotionalEmails,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Request a password-reset link
// @route POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  // Same reply whether or not the email exists, so nobody can probe which emails are registered.
  const genericReply = {
    message: "If an account exists for that email, a password reset link has been sent.",
  };
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Please enter your email" });

    const user = await User.findOne({ email });
    if (!user) return res.json(genericReply);

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save();

    const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");
    const resetUrl = `${clientUrl}/reset-password/${rawToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your Wingspan password",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#0b3a66">Reset your password</h2>
            <p>Hi ${user.fullName},</p>
            <p>We received a request to reset your Wingspan password. This link is valid for 30 minutes.</p>
            <p><a href="${resetUrl}" style="display:inline-block;background:#fbd531;color:#0b3a66;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Reset Password</a></p>
            <p style="font-size:13px;color:#666">If the button doesn't work, copy this link:<br>${resetUrl}</p>
            <p style="font-size:13px;color:#666">If you didn't request this, you can safely ignore this email.</p>
          </div>`,
      });
    } catch (mailError) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      console.error("Password reset email failed:", mailError.message);
      return res.status(500).json({ message: "Could not send reset email. Please try again later." });
    }

    res.json(genericReply);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Set a new password using the emailed token
// @route POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ message: "This reset link is invalid or has expired" });
    }

    user.password = password; // hashed by the pre-save hook
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password updated successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { signup, login, getMe, updateMe, forgotPassword, resetPassword };
