// Controller: Handles all recipe-related API logic
// `models/recipe` exports the Model directly (not an object), so require it as default
const Recipe = require('../models/recipe');
const axios = require('axios');

const NUTRITION_API_KEY = process.env.NUTRITION_API_KEY;
const NUTRITION_API_URL = process.env.NUTRITION_API_URL;

// 🥗 Get all recipes
exports.list = async (req, res) => {
  try {
    const recipes = await Recipe.findAll({ order: [['id', 'DESC']], limit: 50 });
    res.json(recipes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
};

// 🍲 Get a single recipe by ID
exports.get = async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
};

// ➕ Create a new recipe
exports.create = async (req, res) => {
  try {
    const payload = {
      title: req.body.title,
      description: req.body.description || '',
      ingredients: Array.isArray(req.body.ingredients)
        ? JSON.stringify(req.body.ingredients)
        : req.body.ingredients || '',
      steps: req.body.steps || '',
      imageUrl: req.body.imageUrl || '',
      author: req.body.author || 'Anonymous',
    };

    const created = await Recipe.create(payload);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
};

// ✏️ Update a recipe
exports.update = async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    await recipe.update(req.body);
    res.json(recipe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
};

// ❌ Delete a recipe
exports.remove = async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    await recipe.destroy();
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
};

// 🧮 Get nutrition info (example using external API)
exports.nutrition = async (req, res) => {
  try {
  // Accept ingredients from query string (GET) or from POST body (body.query or body.ing)
  const ing = (req.query && req.query.ing) || (req.body && (req.body.query || req.body.ing));
  if (!ing) return res.status(400).json({ error: 'No ingredients provided' });
    const targetUrl = NUTRITION_API_URL || '';

    // If the configured URL looks like USDA FoodData Central (fdc), use the
    // POST /foods/search endpoint which expects JSON body (see FDC API).
    if (/fdc|nal\.usda|fooddata/i.test(targetUrl)) {
      if (!NUTRITION_API_KEY) {
        return res.status(500).json({ error: 'USDA API key not configured' });
      }

      // If client sent a POST body, forward it (useful for advanced search options).
      // Otherwise construct a minimal body from the `ing` query param.
      const clientBody = req.method === 'POST' && req.body && Object.keys(req.body).length > 0
        ? req.body
        : { query: String(ing), pageSize: 5 };

      // Defensive: ensure a query exists for FDC searches
      if (!clientBody.query) clientBody.query = String(ing);

      const params = { api_key: NUTRITION_API_KEY };

      const resp = await axios.post(targetUrl, clientBody, { params, timeout: 10000, headers: { 'Content-Type': 'application/json' } });

      if (!resp || !resp.data) return res.status(502).json({ error: 'Empty response from nutrition provider' });

      // FDC returns { foods: [...] } — return a small preview to the client
      const foods = resp.data.foods || resp.data || [];
      const preview = Array.isArray(foods)
        ? foods.map(f => ({ fdcId: f.fdcId, description: f.description, dataType: f.dataType })).slice(0, 5)
        : foods;

      return res.json({ provider: 'usda', preview, raw: resp.data });
    }

    // Generic provider fallback (e.g., Edamam nutrition API) - send as query params
    const params = { ingr: ing };
    if (NUTRITION_API_KEY) {
      params.app_key = NUTRITION_API_KEY;
      params.api_key = NUTRITION_API_KEY;
      params.key = NUTRITION_API_KEY;
      params.app_id = process.env.NUTRITION_APP_ID || NUTRITION_API_KEY;
    }

    const resp = await axios.get(targetUrl, { params, timeout: 10000 });

    if (resp.status < 200 || resp.status >= 300) {
      console.error('Nutrition API returned', resp.status, resp.statusText);
      return res.status(502).json({ error: 'Nutrition provider error', details: resp.statusText });
    }

    res.json({ provider: 'generic', raw: resp.data });
  } catch (err) {
    console.error('Nutrition API error:', err && err.response ? err.response.data || err.response.statusText : err.message);
    // If the external API sent a response, forward some detail (without leaking secrets)
    if (err.response) {
      return res.status(502).json({ error: 'Nutrition API failed', details: err.response.data || err.response.statusText });
    }
    res.status(500).json({ error: 'Nutrition API failed', details: err.message });
  }
};

// Proxy to Spoonacular parseIngredients endpoint (RapidAPI)
exports.spoonacular = async (req, res) => {
  try {
    const apiKey = process.env.SPOONACULAR_API_KEY;
  const apiHost = process.env.SPOONACULAR_API_HOST || 'spoonacular-recipe-food-nutrition-v1.p.rapidapi.com';
  // Allow a full URL override (optional). If provided, use it directly.
  const apiUrlOverride = process.env.SPOONACULAR_API_URL || '';

    // If no API key is configured, allow a developer mock mode so the UI can be
    // tested without a real RapidAPI key. Enable by setting SPOONACULAR_MOCK=true
    // in your .env. If mock mode is not enabled, require the API key.
    const mockEnabled = String(process.env.SPOONACULAR_MOCK || '').toLowerCase() === 'true';
    if (!apiKey && !mockEnabled) return res.status(500).json({ error: 'SPOONACULAR_API_KEY not configured in environment' });

    // Expect JSON body: { ingredientList: "1 banana\n2 tbsp pb\n1 cup milk", servings: '1', includeNutrition: 'true' }
    const { ingredientList, servings = '1', includeNutrition = 'true' } = req.body || {};
    if (!ingredientList) return res.status(400).json({ error: 'No ingredientList provided in request body' });

    const params = new URLSearchParams();
    params.append('ingredientList', String(ingredientList));
    params.append('servings', String(servings));
    params.append('includeNutrition', String(includeNutrition));

  const url = apiUrlOverride || ('https://' + apiHost + '/recipes/parseIngredients');

    // If mock mode is enabled and no API key provided, return a small mocked
    // response that resembles Spoonacular's parseIngredients output for UI testing.
    if (mockEnabled && !apiKey) {
      const mock = [
        {
          name: 'banana',
          amount: 1,
          unit: '',
          nutrition: {
            nutrients: [
              { name: 'Calories', amount: 105, unit: 'kcal' },
              { name: 'Carbohydrates', amount: 27, unit: 'g' }
            ]
          }
        },
        {
          name: 'peanut butter',
          amount: 2,
          unit: 'tbsp',
          nutrition: {
            nutrients: [
              { name: 'Calories', amount: 188, unit: 'kcal' },
              { name: 'Protein', amount: 8, unit: 'g' }
            ]
          }
        }
      ];
      return res.json(mock);
    }

    const resp = await axios.post(url, params.toString(), {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': apiHost,
      },
      timeout: 15000,
    });

    // forward response body
    res.json(resp.data);
  } catch (err) {
    // Improve common RapidAPI error messages for clarity
    const respErr = err && err.response;
    if (respErr) {
      const status = respErr.status;
      const data = respErr.data || respErr.statusText || {};
      console.error('Spoonacular proxy error:', status, data);

      if (status === 401 || status === 403) {
        return res.status(502).json({ error: 'Spoonacular API authentication failed', details: data });
      }
      if (status === 429) {
        return res.status(502).json({ error: 'Spoonacular rate limit exceeded', details: data });
      }
      if (status === 402 || (data && typeof data === 'object' && data.message && /not subscribed/i.test(String(data.message)))) {
        return res.status(502).json({ error: 'Spoonacular subscription required', details: data });
      }

      return res.status(status || 502).json({ error: 'Spoonacular API failed', details: data });
    }

    console.error('Spoonacular proxy error (network):', err.message || err);
    res.status(500).json({ error: 'Spoonacular proxy failed', details: err.message });
  }
};
