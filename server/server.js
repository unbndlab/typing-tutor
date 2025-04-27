require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); // Load .env file from root
const express = require('express');
const cors = require('cors');
const path = require('path');

const contentRoutes = require('./routes/content');
const resultsRoutes = require('./routes/results');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
// Enable CORS for all origins (adjust for production if needed)
app.use(cors());
// Parse JSON request bodies
app.use(express.json());

// --- API Routes ---
app.use('/api/content', contentRoutes);
app.use('/api/results', resultsRoutes);

// --- Serve Static Frontend Files ---
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// --- Catch-all for Frontend Routing (Optional, useful for SPAs) ---
app.get('*', (req, res, next) => { // Added next parameter
  // Ensure API calls aren't caught here
  if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(publicPath, 'index.html'));
  } else {
      // If it's an unmatched API route, let error handler catch it
       next(); // Pass control to next middleware (likely error handler)
  }
});


// --- Basic Error Handling Middleware ---
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    // Only include stack trace in development
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Log DB details for verification (mask password)
  console.log(`Connecting to DB: ${process.env.DB_DATABASE} on ${process.env.DB_HOST} as ${process.env.DB_USER}`);
});
