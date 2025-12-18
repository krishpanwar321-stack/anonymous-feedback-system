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

module.exports = router;
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
