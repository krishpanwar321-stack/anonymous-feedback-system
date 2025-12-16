const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * CREATE FORM
 */
router.post("/", async (req, res) => {
  const { userId, title, description } = req.body;

  if (!userId || !title) {
    return res.status(400).json({ error: "userId and title are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO forms (user_id, title, description)
       VALUES ($1, $2, $3)
       RETURNING id, title, description, created_at`,
      [userId, title, description || null]
    );

    res.status(201).json({
      message: "Form created",
      form: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
/**
 * ADD QUESTION TO FORM
 */
router.post("/:formId/questions", async (req, res) => {
    const { formId } = req.params;
    const { questionText, questionType } = req.body;
  
    if (!questionText || !questionType) {
      return res.status(400).json({
        error: "questionText and questionType are required"
      });
    }
  
    try {
      const result = await pool.query(
        `INSERT INTO questions (form_id, question_text, question_type)
         VALUES ($1, $2, $3)
         RETURNING id, question_text, question_type`,
        [formId, questionText, questionType]
      );
  
      res.status(201).json({
        message: "Question added",
        question: result.rows[0]
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  /**
 * GET FORM + QUESTIONS (PUBLIC)
 */
router.get("/:formId", async (req, res) => {
    const { formId } = req.params;
  
    try {
      // Get form details
      const formResult = await pool.query(
        `SELECT id, title, description
         FROM forms
         WHERE id = $1`,
        [formId]
      );
  
      if (formResult.rows.length === 0) {
        return res.status(404).json({ error: "Form not found" });
      }
  
      // Get questions
      const questionsResult = await pool.query(
        `SELECT id, question_text, question_type
         FROM questions
         WHERE form_id = $1
         ORDER BY id`,
        [formId]
      );
  
      res.json({
        form: formResult.rows[0],
        questions: questionsResult.rows
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  /**
 * GET FORMS FOR ADMIN
 */
router.get("/user/:userId", async (req, res) => {
    const { userId } = req.params;
  
    try {
      const result = await pool.query(
        "SELECT id, title, created_at FROM forms WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
  
      res.json({ forms: result.rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  