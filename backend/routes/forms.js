const express = require("express");
const pool = require("../db");

const router = express.Router();
/* =========================
   CREATE FORM
========================= */
router.post("/", async (req, res) => {
  const { userId, title, description } = req.body;

  if (!userId || !title) {
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    // Get user plan
    const user = await pool.query(
      "SELECT plan FROM users WHERE id = $1",
      [userId]
    );

    const plan = user.rows[0]?.plan || "FREE";

    // Count existing forms
    const count = await pool.query(
      "SELECT COUNT(*) FROM forms WHERE user_id = $1",
      [userId]
    );

    const totalForms = parseInt(count.rows[0].count);
    const LIMITS = {
      FREE: 3,
      STARTER: 51,
      PRO: 350,
      ULTRA: Infinity
    };
    
    if (LIMITS[plan] !== Infinity && totalForms >= LIMITS[plan]) {    
      return res.status(403).json({
        error: "Form limit reached. Please upgrade."
      });
    }

    const result = await pool.query(
      `INSERT INTO forms (user_id, title, description)
       VALUES ($1, $2, $3)
       RETURNING id, title, created_at`,
      [userId, title, description || null]
    );

    res.json({ form: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
/* =========================
   ADD QUESTION
========================= */
router.post("/:formId/questions", async (req, res) => {
  const { formId } = req.params;
  const { questionText, questionType, options } = req.body;

  try {
    const result = await pool.query(
      `
      INSERT INTO questions (form_id, question_text, question_type, options)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        formId,
        questionText,
        questionType,
        options && options.length ? JSON.stringify(options) : null
      ]
    );

    res.status(201).json({ question: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
/* =========================
   GET FORMS FOR ADMIN
========================= */
router.get("/user/:userId", async (req, res) => {
    const { userId } = req.params;
  
    try {
      const result = await pool.query(
        `
        SELECT
          forms.id,
          forms.title,
          forms.created_at,
          COUNT(responses.id) AS response_count
        FROM forms
        LEFT JOIN responses ON responses.form_id = forms.id
        WHERE forms.user_id = $1
        GROUP BY forms.id
        ORDER BY forms.created_at DESC
        `,
        [userId]
      );
  
      res.json({ forms: result.rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
/* =========================
   GET FORM + QUESTIONS (PUBLIC)
========================= */
router.get("/:formId", async (req, res) => {
  const { formId } = req.params;

  try {
    const form = await pool.query(
      `SELECT id, title, description FROM forms WHERE id = $1`,
      [formId]
    );

    if (form.rows.length === 0) {
      return res.status(404).json({ error: "Form not found" });
    }

    const questions = await pool.query(
      `
      SELECT id, question_text, question_type, options
      FROM questions
      WHERE form_id = $1
      ORDER BY created_at ASC
      `,
      [formId]
    );

    res.json({
      form: form.rows[0],
      questions: questions.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* =========================
   DELETE FORM
========================= */
router.delete("/:formId", async (req, res) => {
  const { formId } = req.params;

  await pool.query("DELETE FROM forms WHERE id = $1", [formId]);
  res.json({ message: "Form deleted" });
});

/* =========================
   EXPORT (ONLY ONCE, AT END)
========================= */
module.exports = router;
