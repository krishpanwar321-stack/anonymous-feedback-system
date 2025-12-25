const express = require("express");
const crypto = require("crypto");
const pool = require("../db");

const router = express.Router();

const PLAN_PRICES = {
  STARTER: 449,
  PRO: 4999,
  ULTRA: 49999
};

router.post("/start", async (req, res) => {
  const { plan, userId, email, name } = req.body;

  if (!PLAN_PRICES[plan]) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  const amount = PLAN_PRICES[plan];
  const txnid = "TXN" + Date.now();

  const hashString =
    `${process.env.PAYU_KEY}|${txnid}|${amount}|${plan}|${name}|${email}|||||||||||${process.env.PAYU_SALT}`;

  const hash = crypto
    .createHash("sha512")
    .update(hashString)
    .digest("hex");

  res.json({
    key: process.env.PAYU_KEY,
    txnid,
    amount,
    productinfo: plan,
    firstname: name,
    email,
    hash,
    surl: `${process.env.BASE_URL}/api/payments/success`,
    furl: `${process.env.BASE_URL}/api/payments/failure`
  });
});

router.post("/success", async (req, res) => {
  const {
    txnid,
    status,
    amount,
    productinfo,
    email
  } = req.body;

  try {
    const user = await pool.query(
      "SELECT id FROM users WHERE email=$1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.redirect("/dashboard.html");
    }

    const userId = user.rows[0].id;

    const interval =
    productinfo === "STARTER" ? "1 month" : "1 year";
  
  await pool.query(
    `UPDATE users
     SET plan = $1,
         plan_expires_at = NOW() + INTERVAL '${interval}'
     WHERE id = $2`,
    [productinfo, userId]
  );
  

    await pool.query(
      "INSERT INTO payments (user_id, plan, amount, status, txnid) VALUES ($1,$2,$3,$4,$5)",
      [userId, productinfo, amount, status, txnid]
    );

    res.redirect("/dashboard.html?payment=success");
  } catch (err) {
    res.redirect("/dashboard.html?payment=failed");
  }
});

router.post("/failure", (req, res) => {
  res.redirect("/pricing.html?payment=failed");
});

module.exports = router;
