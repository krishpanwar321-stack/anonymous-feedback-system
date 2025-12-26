const pool = require("../db");

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

module.exports = { normalizeUserPlan };
