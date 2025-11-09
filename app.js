const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
// Debug: indicate whether Spoonacular key is loaded (true/false). This avoids
// printing the actual secret to logs while helping diagnose missing env vars.
console.log('SPOONACULAR_API_KEY present:', Boolean(process.env.SPOONACULAR_API_KEY));
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const { sequelize } = require('./models/db');
sequelize.sync()
  .then(() => console.log('✅ Database synced'))
  .catch(err => console.error('❌ Database sync error:', err));

// Routes
const recipeRoutes = require('./routes/recipes');
app.use('/api/recipes', recipeRoutes);

// Nutrition routes (Spoonacular proxy)
const nutritionRoutes = require('./routes/nutrition');
app.use('/api/nutrition', nutritionRoutes);

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server with a small retry/fallback when port is already in use
const startServer = (port) => {
  const server = app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} is already in use.`);

      // If the port looks like a typical DB port (3306) and user didn't intend it,
      // fall back to 3000 to avoid colliding with DB server.
      const fallback = port === 3306 ? 3000 : port + 1;
      console.warn(`Trying fallback port ${fallback}...`);

      // Avoid infinite recursion: if fallback is same as requested, exit.
      if (fallback === port) {
        console.error('No available fallback port. Exiting.');
        process.exit(1);
      }

      // Try the fallback port after a short delay to avoid rapid retries.
      setTimeout(() => startServer(fallback), 200);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
};

const desiredPort = parseInt(process.env.PORT, 10) || 3000;
startServer(desiredPort);
