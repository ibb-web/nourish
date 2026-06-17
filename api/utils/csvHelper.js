function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function mealPlanToCsvRows(mealPlan, recipesById = {}) {
  // rows: Date, Meal Name, Meal Type, Calories, Protein, Carbohydrates, Fat
  const rows = [];
  const start = mealPlan.weekStart ? new Date(mealPlan.weekStart) : null;
  for (const dayObj of mealPlan.days || []) {
    const day = dayObj.day;
    const dayIdx = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(day);
    const dateLabel = (() => {
      if (!start || dayIdx < 0) return day;
      const d = new Date(start);
      d.setDate(d.getDate() + dayIdx);
      return d.toISOString().slice(0, 10);
    })();
    for (const mealType of ['breakfast', 'lunch', 'dinner']) {
      const items = (dayObj.meals && dayObj.meals[mealType]) || [];
      if (!items.length) {
        rows.push([dateLabel, '', mealType, '', '', '', '']);
        continue;
      }
      for (const item of items) {
        const recipeId = item.recipeId || '';
        const portion = item.portion || '';
        const recipe = recipesById[recipeId] || {};
        const name = recipe.name || '';
        const calories = recipe.calories ? Number(recipe.calories) * Number(portion || 1) : '';
        const protein = recipe.macros?.protein ? Number(recipe.macros.protein) * Number(portion || 1) : '';
        const carbs = recipe.macros?.carbs ? Number(recipe.macros.carbs) * Number(portion || 1) : '';
        const fat = recipe.macros?.fat ? Number(recipe.macros.fat) * Number(portion || 1) : '';
        rows.push([dateLabel, name, mealType, calories, protein, carbs, fat]);
      }
    }
  }
  return rows;
}

function buildCsv(mealPlan, recipesById) {
  const header = ['Date', 'Meal Name', 'Meal Type', 'Calories', 'Protein', 'Carbohydrates', 'Fat'];
  const rows = mealPlanToCsvRows(mealPlan, recipesById);
  const lines = [header.map(escapeCsv).join(',')];
  for (const row of rows) lines.push(row.map(escapeCsv).join(','));
  return lines.join('\n');
}

module.exports = { buildCsv };
