// Fetch all recipes from backend
async function fetchRecipes() {
  const res = await fetch('/api/recipes');
  const data = await res.json();
  const container = document.getElementById('recipes');
  container.innerHTML = '';

  data.forEach(r => {
    const card = document.createElement('div');
    card.className = 'card';
    const ingredients = parseIngredients(r.ingredients);

    card.innerHTML = `
      <h3>${escapeHtml(r.title)}</h3>
      <small>By ${escapeHtml(r.author || 'Anonymous')}</small>
      <p>${escapeHtml(r.description || '')}</p>
      <p><strong>Ingredients:</strong><br>${ingredients.map(i => escapeHtml(i)).join('<br>')}</p>
      <p><button onclick="viewNutrition('${encodeURIComponent(ingredients.join(', '))}', ${r.id})">View Nutrition</button></p>
      <p><a href="#" onclick="deleteRecipe(${r.id});return false;">🗑️ Delete</a></p>
    `;

    container.appendChild(card);
  });
}

// Parse ingredients string or JSON
function parseIngredients(txt) {
  if (!txt) return [];
  try {
    const arr = JSON.parse(txt);
    if (Array.isArray(arr)) return arr;
  } catch (e) {}
  return txt.split('\n').map(s => s.trim()).filter(Boolean);
}

// Escape HTML to prevent XSS
function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// Handle recipe submission
document.getElementById('recipeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = {
    title: form.title.value,
    author: form.author.value,
    ingredients: form.ingredients.value.split('\n').map(s => s.trim()).filter(Boolean),
    steps: form.steps.value,
    imageUrl: form.imageUrl.value,
  };

  await fetch('/api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  form.reset();
  fetchRecipes();
});

// Delete a recipe
async function deleteRecipe(id) {
  if (!confirm('Delete this recipe?')) return;
  await fetch('/api/recipes/' + id, { method: 'DELETE' });
  fetchRecipes();
}

// Navigate to nutrition page for a recipe
function viewNutrition(ingStr, recipeId) {
  // ingStr is already URL-encoded in the onclick binding
  window.location.href = `/nutrition.html?id=${recipeId}&ing=${ingStr}`;
}

// Initial load
fetchRecipes();
