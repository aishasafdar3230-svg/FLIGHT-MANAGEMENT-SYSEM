const express = require("express");
const { signup, login, getMe, updateMe, forgotPassword, resetPassword } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);

module.exports = router;
