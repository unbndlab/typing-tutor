const fs = require('fs').promises;
const path = require('path');
const pool = require('../db'); // DB connection pool

async function createTables() {
    const connection = await pool.getConnection();
    try {
        console.log('Creating tables if they do not exist...');

        // Lessons Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS lessons (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guid VARCHAR(50) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                focus_keys VARCHAR(100) NULL,
                sequence INT NULL,
                category VARCHAR(50) DEFAULT 'lesson',
                lesson_text TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('  - Lessons table checked/created.');

        // Tests Table (separate from lessons)
         await connection.query(`
            CREATE TABLE IF NOT EXISTS tests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guid VARCHAR(50) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(50) NOT NULL, -- e.g., 'words', 'time', 'code', 'quote'
                difficulty VARCHAR(50) NULL,
                word_count INT NULL,
                duration INT NULL,         -- Duration in seconds for time tests
                text_source VARCHAR(100) NULL, -- Link to word list or indicates embedded text
                test_text TEXT NULL,          -- For tests with specific embedded text (like code, quotes)
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('  - Tests table checked/created.');


        // Results Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                wpm INT NOT NULL,
                accuracy DECIMAL(5, 2) NOT NULL,
                errors INT NOT NULL,
                duration_seconds INT NULL,
                mode VARCHAR(50) NOT NULL,       -- e.g., 'lesson', 'test', 'words', 'time'
                reference_id VARCHAR(50) NULL, -- guid of the lesson or test taken
                INDEX idx_mode_ref (mode, reference_id) -- Index for faster lookup
            );
        `);
        console.log('  - Results table checked/created.');

        console.log('Table creation process finished.');

    } catch (error) {
        console.error('Error creating tables:', error);
        throw error; // Re-throw to stop script if tables fail
    } finally {
        if (connection) connection.release();
    }
}


async function populateData() {
    const connection = await pool.getConnection();
    try {
        console.log('Reading content.json...');
        const contentPath = path.join(__dirname, '../../content.json');
        const contentData = await fs.readFile(contentPath, 'utf-8');
        const content = JSON.parse(contentData);

        // --- Populate Lessons ---
        if (content.lessons && content.lessons.length > 0) {
            console.log(`Populating ${content.lessons.length} lessons...`);
            const lessonSql = `
                INSERT INTO lessons (guid, title, focus_keys, sequence, category, lesson_text)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    focus_keys = VALUES(focus_keys),
                    sequence = VALUES(sequence),
                    category = VALUES(category),
                    lesson_text = VALUES(lesson_text);
            `; // Use ON DUPLICATE KEY UPDATE to avoid errors on re-run

            for (const lesson of content.lessons) {
                await connection.execute(lessonSql, [
                    lesson.guid,
                    lesson.title,
                    lesson.focusKeys || null,
                    lesson.sequence || null,
                    lesson.category || 'lesson',
                    lesson.text
                ]);
            }
            console.log('Lessons population finished.');
        } else {
             console.log('No lessons found in content.json to populate.');
        }

         // --- Populate Tests ---
         if (content.tests && content.tests.length > 0) {
            console.log(`Populating ${content.tests.length} tests...`);
             const testSql = `
                INSERT INTO tests (guid, title, category, difficulty, word_count, duration, text_source, test_text)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    title=VALUES(title), category=VALUES(category), difficulty=VALUES(difficulty),
                    word_count=VALUES(word_count), duration=VALUES(duration), text_source=VALUES(text_source),
                    test_text=VALUES(test_text);
             `;

            for (const test of content.tests) {
                await connection.execute(testSql, [
                    test.guid,
                    test.title,
                    test.category,
                    test.difficulty || null,
                    test.wordCount || null,
                    test.duration || null,
                    test.textSource || null,
                    test.text || null // Use test.text if directly embedded
                ]);
            }
             console.log('Tests population finished.');
         } else {
             console.log('No tests found in content.json to populate.');
         }


        console.log('Data population finished.');

    } catch (error) {
        console.error('Error populating data:', error);
    } finally {
        if (connection) connection.release();
        // Don't close the pool here if the main server might still need it right after
        // await pool.end();
        // console.log('Database pool closed.');
    }
}

// Run the functions
async function runSetup() {
    try {
        await createTables();
        await populateData();
        console.log('Database setup script completed successfully.');
    } catch (error) {
        console.error('Database setup script failed:', error);
        process.exit(1); // Exit with error code
    } finally {
        await pool.end(); // Close pool after script finishes
        console.log('Database pool closed.');
    }
}

runSetup();
