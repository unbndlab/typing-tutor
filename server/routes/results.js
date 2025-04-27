const express = require('express');
const pool = require('../db'); // DB connection pool
const router = express.Router();

// GET all results
router.get('/', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM results ORDER BY timestamp DESC');
    res.json(results);
  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).json({ message: "Error fetching results", error: error.message });
  }
});

// POST a new result
router.post('/', async (req, res) => {
  const { wpm, accuracy, errors, duration_seconds, mode, reference_id } = req.body;

  // Basic validation
  if (wpm == null || accuracy == null || errors == null) {
    return res.status(400).json({ message: "Missing required result fields (wpm, accuracy, errors)" });
  }

  const sql = `
    INSERT INTO results (wpm, accuracy, errors, duration_seconds, mode, reference_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const values = [
    parseInt(wpm, 10),
    parseFloat(accuracy),
    parseInt(errors, 10),
    duration_seconds ? parseInt(duration_seconds, 10) : null,
    mode,
    reference_id
  ];

  try {
    const [result] = await pool.execute(sql, values);
    res.status(201).json({ message: "Result saved successfully", id: result.insertId });
  } catch (error) {
    console.error("Error saving result:", error);
    res.status(500).json({ message: "Error saving result", error: error.message });
  }
});

module.exports = router; // Make sure this line is present and correct!
