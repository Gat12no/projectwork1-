// nutrition.js - fetches recipe and nutrition preview and renders API messages

function qs(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"]+/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]||c));
}

async function showError(container, title, details) {
  container.innerHTML = `<div class="card" style="border-left:4px solid #e67e22;background:#fff6f0;padding:12px;margin-bottom:12px;"><strong>${escapeHtml(title)}</strong><pre style="white-space:pre-wrap;margin-top:8px;">${escapeHtml(details)}</pre></div>`;
}

async function fetchRecipe(id) {
  try {
    const res = await fetch(`/api/recipes/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function init() {
  const recipeId = qs('id') || qs('recipeId');
  const ingParam = qs('ing') || '';
  const titleEl = document.getElementById('recipe-title');
  const ingredEl = document.getElementById('recipe-ingredients');
  const previewEl = document.getElementById('preview-container');
  const rawEl = document.getElementById('raw-json');

  // The UX requested: show only the API answer. Hide recipe metadata and the
  // spoonacular input form (if present), and hide the raw response block —
  // render the API response JSON into the main preview area only.
  const recipeInfo = document.getElementById('recipe-info');
  if (recipeInfo) recipeInfo.style.display = 'none';
  const spoonForm = document.getElementById('spoon-form');
  if (spoonForm) spoonForm.style.display = 'none';
  const rawSection = document.getElementById('nutrition-raw');
  if (rawSection) rawSection.style.display = 'none';

  // Clear preview area — we'll render the API JSON here when it arrives.
  titleEl.textContent = '';
  previewEl.textContent = '';

  let ingredientsText = decodeURIComponent(ingParam || '').replace(/\+/g, ' ');

  // If we have a recipe id, try to fetch recipe details to show nicer text
  if (recipeId) {
    const r = await fetchRecipe(recipeId);
    if (r) {
      titleEl.textContent = r.title || 'Recipe';
      if (r.ingredients) {
        // r.ingredients may be JSON array or text
        try {
          const arr = JSON.parse(r.ingredients);
          if (Array.isArray(arr)) {
            ingredientsText = arr.join(', ');
            ingredEl.textContent = arr.join('\n');
          } else {
            ingredEl.textContent = String(r.ingredients);
          }
        } catch (e) {
          ingredEl.textContent = String(r.ingredients);
        }
      } else {
        ingredEl.textContent = ingredientsText;
      }
    } else {
      titleEl.textContent = 'Recipe (not found)';
      ingredEl.textContent = ingredientsText;
    }
  } else {
    titleEl.textContent = 'Recipe';
    ingredEl.textContent = ingredientsText;
  }

  // Build body for POST — send query to FDC or fallback to simple query
  const body = { query: ingredientsText || '' };

  try {
    const resp = await fetch(`/api/recipes/${recipeId || 0}/nutrition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const text = await resp.text();
    // Try parse JSON safely
    let data;
    try { data = JSON.parse(text); } catch (e) { data = text; }

    if (!resp.ok) {
      // On error render the API error JSON only
      const details = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      previewEl.innerHTML = `<pre style="white-space:pre-wrap">${escapeHtml(details)}</pre>`;
      return;
    }

    // Successful response — render only the API result (as pretty JSON) into
    // the preview area per request.
    const pretty = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    previewEl.innerHTML = `<pre style="white-space:pre-wrap">${escapeHtml(pretty)}</pre>`;
  } catch (err) {
    previewEl.innerHTML = '';
    await showError(previewEl, 'Network error', err.message || String(err));
    rawEl.textContent = err.message || String(err);
  }
}

window.addEventListener('DOMContentLoaded', init);

// Spoonacular form handling
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('spoon-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const list = document.getElementById('ingredientList').value.trim();
    const servings = document.getElementById('servings').value || '1';
    const previewEl = document.getElementById('preview-container');
    const rawEl = document.getElementById('raw-json');

    previewEl.innerHTML = '';
    rawEl.textContent = '';

    if (!list) {
      previewEl.innerHTML = '<div class="card">Please enter one or more ingredients.</div>';
      return;
    }

    try {
      const resp = await fetch('/api/nutrition/spoonacular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientList: list, servings, includeNutrition: 'true' })
      });

      const data = await resp.json();
      if (!resp.ok) {
        previewEl.innerHTML = '';
        previewEl.innerHTML = `<div class="card"><strong>API Error (${resp.status})</strong><pre>${JSON.stringify(data,null,2)}</pre></div>`;
        rawEl.textContent = JSON.stringify(data, null, 2);
        return;
      }

      // data is expected to be an array per Spoonacular docs
      rawEl.textContent = JSON.stringify(data, null, 2);
      previewEl.innerHTML = '';
      if (Array.isArray(data)) {
        data.forEach(item => {
          const card = document.createElement('div');
          card.className = 'card';
          const name = item.name || item.original || 'Item';
          const nutrients = (item.nutrition && item.nutrition.nutrients) || [];
          const nutList = nutrients.map(n => `${n.name}: ${n.amount} ${n.unit}`).join('\n');
          card.innerHTML = `<h4>${escapeHtml(name)}</h4><pre style="white-space:pre-wrap">${escapeHtml(nutList)}</pre>`;
          previewEl.appendChild(card);
        });
      } else {
        previewEl.innerHTML = `<div class="card"><pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre></div>`;
      }
    } catch (err) {
      previewEl.innerHTML = `<div class="card">Network error: ${escapeHtml(err.message || String(err))}</div>`;
      rawEl.textContent = err.message || String(err);
    }
  });
});
