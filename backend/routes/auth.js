console.log("✅ auth routes loaded");
const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");

const router = express.Router();

/* =========================
   SIGNUP (NEW USER)
========================= */
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3)",
      [name, email, hashedPassword]
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
   LOGIN (EXISTING USER)
========================= */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
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

    res.json({ userId: user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
