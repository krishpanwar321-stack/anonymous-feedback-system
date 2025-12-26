require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./db");

const app = express();
async function normalizeUserPlan(userId) {
  const res = await pool.query(
    "SELECT plan, plan_expires_at FROM users WHERE id = $1",
    [userId]
  );

  if (res.rows.length === 0) return null;

  const { plan, plan_expires_at } = res.rows[0];

  if (plan_expires_at && new Date(plan_expires_at) < new Date()) {
    await pool.query(
      "UPDATE users SET plan = 'FREE', plan_expires_at = NULL WHERE id = $1",
      [userId]
    );

    return { plan: "FREE", expired: true };
  }

  return { plan, expired: false };
}
/* ROUTES */
const authRoutes = require("./routes/auth");
const formRoutes = require("./routes/forms");
const responseRoutes = require("./routes/responses");
const paymentRoutes = require("./routes/payments");

/* MIDDLEWARE */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // 🔥 REQUIRED FOR PAYU

/* STATIC FRONTEND */
const FRONTEND_PATH = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONTEND_PATH));

/* API ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/responses", responseRoutes);
app.use("/api/payments", paymentRoutes);
 
app.get("/api/dashboard/usage", async (req, res) => {
  const { userId } = req.query;

  try {
    const userRes = await pool.query(
      "SELECT plan, plan_expires_at FROM users WHERE id = $1",
      [userId]
    );

    const normalized = await normalizeUserPlan(userId);
    const plan = normalized.plan;
    const plan_expires_at =
    normalized.expired ? null : userRes.rows[0].plan_expires_at;

    const countRes = await pool.query(
      "SELECT COUNT(*) FROM forms WHERE user_id = $1",
      [userId]
    );

    const formsCreated = parseInt(countRes.rows[0].count);

    const LIMITS = {
      FREE: 3,
      STARTER: 51,
      PRO: 350,
      ULTRA: null
    };

    const formsLimit = LIMITS[plan];
    const formsLeft =
      formsLimit === null ? null : formsLimit - formsCreated;

    let daysLeft = null;
    if (plan_expires_at) {
      daysLeft = Math.ceil(
        (new Date(plan_expires_at) - new Date()) / (1000 * 60 * 60 * 24)
      );
    }

    res.json({
      plan,
      formsCreated,
      formsLimit,
      formsLeft,
      daysLeft
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* FALLBACK */
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }

  res.sendFile(path.join(FRONTEND_PATH, "login.html"));
});

/* START SERVER */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
