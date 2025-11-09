const express = require('express');
const router = express.Router();
const controller = require('../controllers/recipeController');

// POST /api/nutrition/spoonacular
router.post('/spoonacular', controller.spoonacular);

module.exports = router;
