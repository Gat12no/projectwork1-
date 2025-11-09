// Routes for Recipe API
const express = require('express');
const router = express.Router();
const controller = require('../controllers/recipeController');

// 📜 Get all recipes
router.get('/', controller.list);

// 📄 Get a single recipe by ID
router.get('/:id', controller.get);

// ➕ Create a new recipe
router.post('/', controller.create);

// ✏️ Update a recipe
router.put('/:id', controller.update);

// ❌ Delete a recipe
router.delete('/:id', controller.remove);

// 🧮 Get nutrition info for a recipe
// Support both GET (query string) and POST (JSON body) for nutrition searches.
// The USDA FoodData Central search endpoint expects a POST with JSON body.
router.get('/:id/nutrition', controller.nutrition);
router.post('/:id/nutrition', controller.nutrition);

module.exports = router;
