console.log("✅ auth routes loaded");

const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");

const router = express.Router();

/* =========================
   SIGNUP
========================= */
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields required" });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (full_name, email, password_hash) VALUES ($1,$2,$3)",
      [name, email, hashed]
    );

    res.json({ message: "Account created" });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   LOGIN (STABLE)
========================= */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    const result = await pool.query(
      "SELECT id, password_hash FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // SIMPLE, RELIABLE
    res.json({ userId: user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* =========================
   GET PROFILE
========================= */
router.get("/profile/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      "SELECT full_name, email FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   UPDATE PROFILE (NAME ONLY)
========================= */
router.put("/profile/:userId", async (req, res) => {
  const { userId } = req.params;
  const { full_name } = req.body;

  if (!full_name) {
    return res.status(400).json({ error: "Name required" });
  }

  try {
    await pool.query(
      "UPDATE users SET full_name = $1 WHERE id = $2",
      [full_name, userId]
    );

    res.json({ message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* =========================
   CHANGE PASSWORD
========================= */
router.put("/change-password/:userId", async (req, res) => {
  const { userId } = req.params;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "All fields required" });
  }

  try {
    const result = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const match = await bcrypt.compare(
      oldPassword,
      result.rows[0].password_hash
    );

    if (!match) {
      return res.status(401).json({ error: "Old password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [hashed, userId]
    );

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const crypto = require("crypto");
const nodemailer = require("nodemailer");

/* =========================
   REQUEST PASSWORD RESET
========================= */
router.post("/request-reset", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  try {
    console.log("OTP REQUEST FOR:", email);

    const result = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ message: "If account exists, OTP sent" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("OTP GENERATED:", otp);

    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "UPDATE users SET reset_otp=$1, reset_otp_expires=$2 WHERE email=$3",
      [hashedOtp, expires, email]
    );

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP is ${otp}. It expires in 10 minutes.`
    });

    console.log("OTP EMAIL SENT");

    res.json({ message: "If account exists, OTP sent" });
  } catch (err) {
    console.error("OTP ERROR:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});
/* =========================
   RESET PASSWORD WITH OTP
========================= */
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: "All fields required" });
  }

  try {
    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const result = await pool.query(
      `SELECT id, reset_otp, reset_otp_expires
       FROM users
       WHERE email=$1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const user = result.rows[0];

    if (
      user.reset_otp !== hashedOtp ||
      !user.reset_otp_expires ||
      new Date(user.reset_otp_expires) < new Date()
    ) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users
       SET password_hash=$1, reset_otp=NULL, reset_otp_expires=NULL
       WHERE email=$2`,
      [hashedPassword, email]
    );

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
