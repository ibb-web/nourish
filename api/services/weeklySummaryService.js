const Progress = require('../models/Progress');
const MealPlan = require('../models/MealPlan');

function startOfCurrentWeek() {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function sum(values) {
  return values.reduce((acc, v) => acc + Number(v || 0), 0);
}

function buildWeeklySummaryContent({ name, progress, mealPlan }) {
  const weekly = progress?.weeklyProgress || [];
  const totalCalories = sum(weekly.map((d) => d.calories));
  const totalTarget = sum(weekly.map((d) => d.target));
  const completionPct = totalTarget > 0 ? Math.round((totalCalories / totalTarget) * 100) : 0;

  const habits = progress?.habits || [];
  const completedHabits = habits.filter((h) => h.today).length;

  const mealsPlanned = (mealPlan?.days || []).reduce((acc, d) => {
    const b = (d.meals?.breakfast || []).length;
    const l = (d.meals?.lunch || []).length;
    const dn = (d.meals?.dinner || []).length;
    return acc + b + l + dn;
  }, 0);

  const subject = `Your Weekly Nourish Summary, ${name || 'there'}`;
  const text = [
    `Hi ${name || 'there'},`,
    '',
    'Here is your weekly summary:',
    `- Total calories: ${totalCalories}`,
    `- Target calories: ${totalTarget}`,
    `- Target completion: ${completionPct}%`,
    `- Habits completed today: ${completedHabits}/${habits.length || 0}`,
    `- Meals planned this week: ${mealsPlanned}`,
    '',
    'Keep going, you are doing great.',
    'Nourish Team',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5; color:#1f2937;">
      <h2 style="margin-bottom:8px;">Weekly Summary</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Here is your weekly summary:</p>
      <ul>
        <li><strong>Total calories:</strong> ${totalCalories}</li>
        <li><strong>Target calories:</strong> ${totalTarget}</li>
        <li><strong>Target completion:</strong> ${completionPct}%</li>
        <li><strong>Habits completed today:</strong> ${completedHabits}/${habits.length || 0}</li>
        <li><strong>Meals planned this week:</strong> ${mealsPlanned}</li>
      </ul>
      <p>Keep going, you are doing great.</p>
      <p>Nourish Team</p>
    </div>
  `;

  return { subject, text, html };
}

async function buildWeeklySummaryForUser(user) {
  const progress = await Progress.findOne({ userId: user._id });
  const weekStart = startOfCurrentWeek();
  const mealPlan = await MealPlan.findOne({ userId: user._id, weekStart }).sort({ createdAt: -1 });
  return buildWeeklySummaryContent({ name: user.name, progress, mealPlan });
}

module.exports = {
  buildWeeklySummaryForUser,
  buildWeeklySummaryContent,
};
