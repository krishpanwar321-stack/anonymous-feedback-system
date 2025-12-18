console.log("✅ auth routes loaded");

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");

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
   LOGIN (FIXED)
========================= */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email=$1",
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

  // ✅ CREATE JWT
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.full_name,
      email: user.email
    }
  });
});

/* =========================
   PROFILE (PROTECTED)
========================= */
router.get("/profile", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  const result = await pool.query(
    "SELECT full_name, email FROM users WHERE id=$1",
    [userId]
  );

  res.json(result.rows[0]);
});

/* =========================
   CHANGE PASSWORD (PROTECTED)
========================= */
router.post("/change-password", authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  const user = await pool.query(
    "SELECT password_hash FROM users WHERE id=$1",
    [userId]
  );

  const match = await bcrypt.compare(
    oldPassword,
    user.rows[0].password_hash
  );

  if (!match) {
    return res.status(400).json({ error: "Wrong old password" });
  }

  const hash = await bcrypt.hash(newPassword, 10);

  await pool.query(
    "UPDATE users SET password_hash=$1 WHERE id=$2",
    [hash, userId]
  );

  res.json({ message: "Password updated" });
});

module.exports = router;
