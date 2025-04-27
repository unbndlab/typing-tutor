const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); // Load .env from root

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection (optional, good for debugging)
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully!');
    connection.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    if (err.code === 'ER_BAD_DB_ERROR') {
        console.error(`Database "${process.env.DB_DATABASE}" does not exist. Please create it.`);
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error(`Access denied for user "${process.env.DB_USER}". Check credentials or privileges.`);
    }
    // Consider exiting if DB connection is critical
    // process.exit(1);
  });


module.exports = pool;
