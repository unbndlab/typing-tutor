const express = require('express');
const pool = require('../db'); // DB connection pool
const router = express.Router();

// GET all lessons
router.get('/lessons', async (req, res) => {
  try {
    const [lessons] = await pool.query('SELECT * FROM lessons ORDER BY sequence ASC');
    res.json(lessons);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).json({ message: "Error fetching lessons", error: error.message });
  }
});

// GET all tests (or specific types if needed later)
router.get('/tests', async (req, res) => {
    try {
      // Simple query for now, could add filtering later
      const [tests] = await pool.query('SELECT * FROM tests ORDER BY title ASC');
      res.json(tests);
    } catch (error) {
      console.error("Error fetching tests:", error);
      res.status(500).json({ message: "Error fetching tests", error: error.message });
    }
  });


// GET word lists (used by tests/modes) - Adjust if needed
router.get('/wordlist/:name', async (req, res) => {
    try {
      // In a real app, word lists might also be in the DB
      // For now, read from content.json (less efficient but simpler setup)
      const fs = require('fs').promises;
      const path = require('path');
      const contentPath = path.join(__dirname, '../../content.json');
      const contentData = await fs.readFile(contentPath, 'utf-8');
      const content = JSON.parse(contentData);

      const listName = req.params.name;
      if (content.wordLists && content.wordLists[listName]) {
          res.json({ words: content.wordLists[listName].split(' ') }); // Send as array
      } else {
          res.status(404).json({ message: `Word list "${listName}" not found.`});
      }
    } catch (error) {
      console.error("Error fetching word list:", error);
      res.status(500).json({ message: "Error fetching word list", error: error.message });
    }
  });


module.exports = router; // Make sure this line is present and correct!
