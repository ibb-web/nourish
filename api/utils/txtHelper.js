function buildGroceryTxt(groceryList) {
  const lines = [];
  lines.push('Nourish Grocery List');
  lines.push(`Week Start: ${new Date(groceryList.weekStart).toISOString().slice(0, 10)}`);
  lines.push('');

  for (const category of groceryList.categories || []) {
    lines.push(`${category.name}`);
    lines.push('-'.repeat(category.name.length));
    for (const item of category.items || []) {
      lines.push(`- ${item.name} (${item.qty})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = { buildGroceryTxt };
