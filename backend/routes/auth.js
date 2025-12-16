console.log("✅ auth routes loaded");
const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");

const router = express.Router();

/**
 * ADMIN SIGNUP
 * (Use once or keep protected later)
 */
router.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
    );

    res.status(201).json({
      message: "Admin created",
      user: result.rows[0]
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * ADMIN LOGIN
 */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      userId: user.id,
      username: user.username
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
