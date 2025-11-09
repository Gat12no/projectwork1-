# Zhimpazhimpa — Setup Steps

Follow these steps to set up and run the project locally (Windows PowerShell examples).

1) Prerequisites
   - Node.js (recommended >= 18). Verify:
     ```powershell
     node --version
     npm --version
     ```

2) Clone & open project
   - If you don't already have the repo locally, clone it and cd into the folder:
     ```powershell
     git clone <your-repo-url> "D:\My Files\Projects\Zhimpazhimpa"
     cd "D:\My Files\Projects\Zhimpazhimpa"
     ```

3) Install dependencies
   ```powershell
   npm install
   ```

4) Configure environment variables
   - Create a `.env` file in the project root (do NOT commit this file). Example contents:
     ```properties
     DB_HOST=localhost
     DB_USER=root
     DB_PASS=9099
     DB_NAME=zhimpazhimpa_db

     # Spoonacular (RapidAPI) settings
     SPOONACULAR_API_KEY=your_rapidapi_key_here
     SPOONACULAR_API_HOST=spoonacular-recipe-food-nutrition-v1.p.rapidapi.com
     SPOONACULAR_API_URL=https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/parseIngredients

     # Development fallback: set to true to use a local mock response for UI testing
     # SPOONACULAR_MOCK=true

     PORT=3000
     ```
   - Replace `your_rapidapi_key_here` with the X-RapidAPI-Key value from RapidAPI.

5) Start the app
   ```powershell
   npm run dev
   ```
   - Expected console output includes:
     - `SPOONACULAR_API_KEY present: true` (if key loaded)
     - `🚀 Server running on http://localhost:3000`
     - `✅ Database synced`

6) Use the app
   - Open `http://localhost:3000` in a browser.
   - Click a recipe's "View Nutrition" button to open the nutrition page.
   - On the nutrition page you can type your ingredients and click "Analyze with Spoonacular".

7) Quick API test (PowerShell)
   ```powershell
   $body = @{ ingredientList = "1 banana`n2 tbsp peanut butter`n1 cup milk"; servings='1'; includeNutrition='true' } | ConvertTo-Json
   Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/nutrition/spoonacular" -Body $body -ContentType 'application/json'
   ```

8) Troubleshooting
   - `SPOONACULAR_API_KEY present: false` -> ensure `.env` is in project root and restart nodemon.
   - `Invalid API key` or `You are not subscribed to this API` -> verify your RapidAPI subscription & key.
   - `Too many requests` -> rate-limited; reduce frequency or upgrade plan.
   - `EADDRINUSE` -> port already in use; set a different port: `$env:PORT=3001; npm run dev`

9) Notes
   - Keep `.env` out of source control.
   - Use `SPOONACULAR_MOCK=true` for UI testing without a live API key.

---
If you'd like, I can also add an aggregated totals section (calories/protein/fat) to the nutrition page or prefill the Spoonacular textarea with the selected recipe's ingredients. Reply with which improvement you want next.