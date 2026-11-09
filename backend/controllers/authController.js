const User = require("../models/User");
const generateToken = require("../utils/generateToken");

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

module.exports = { signup, login, getMe, updateMe };
