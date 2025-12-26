const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * SUBMIT ANONYMOUS RESPONSE (PUBLIC)
 */
router.post("/", async (req, res) => {
  const { formId, answers } = req.body;

  if (!formId || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({
      error: "formId and answers array are required"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create response entry
    const responseResult = await client.query(
      `INSERT INTO responses (form_id)
       VALUES ($1)
       RETURNING id`,
      [formId]
    );

    const responseId = responseResult.rows[0].id;

    // Insert answers
    for (const ans of answers) {
      const { questionId, answerText } = ans;

      await client.query(
        `INSERT INTO answers (response_id, question_id, answer_text)
         VALUES ($1, $2, $3)`,
        [responseId, questionId, answerText]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Feedback submitted successfully"
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;

/**
 * GET RESPONSES FOR A FORM (ADMIN)
 */
router.get("/:formId", async (req, res) => {
    const { formId } = req.params;
  
    try {
      // Get form details
      const formResult = await pool.query(
        `SELECT id, title
         FROM forms
         WHERE id = $1`,
        [formId]
      );
  
      if (formResult.rows.length === 0) {
        return res.status(404).json({ error: "Form not found" });
      }
  
      // Get questions
      const questionsResult = await pool.query(
        `SELECT id, question_text
         FROM questions
         WHERE form_id = $1`,
        [formId]
      );
  
      const questions = questionsResult.rows;
  
      // Get answers
      const answersResult = await pool.query(
        `SELECT q.id AS question_id, a.answer_text
         FROM answers a
         JOIN questions q ON a.question_id = q.id
         JOIN responses r ON a.response_id = r.id
         WHERE r.form_id = $1`,
        [formId]
      );
  
      // Group answers by question
      const grouped = questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        answers: answersResult.rows
          .filter(a => a.question_id === q.id)
          .map(a => a.answer_text)
      }));
  
      res.json({
        form: formResult.rows[0],
        questions: grouped
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  