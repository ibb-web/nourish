import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Flame, Droplet, Beef, Wheat, Egg, Plus, Minus, TrendingUp, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useApp } from "@/context/AppContext";
import { apiGet } from "@/lib/api";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type ProgressDoc = {
  _id: string;
  userId: string;
  water?: number;
  weeklyProgress: { day: string; calories: number; target: number }[];
  weightProgress: { week: string; weight: number }[];
  habits: { id?: string; name: string; streak: number; today: boolean }[];
  achievements: { id: string; title: string; description: string; icon?: string; unlocked: boolean }[];
  macroSplit: { name: string; value: number; color: string }[];
};

type MealPlanDoc = {
  _id: string;
  userId: string;
  weekStart: string;
  days: Array<{
    day: string;
    meals: {
      breakfast: Array<{ recipeId: string; portion: number }>;
      lunch: Array<{ recipeId: string; portion: number }>;
      dinner: Array<{ recipeId: string; portion: number }>;
    };
  }>;
};

type RecipeDoc = {
  _id: string;
  externalId?: string;
  name: string;
  calories: number;
  macros: { protein: number; carbs: number; fat: number };
  emoji?: string;
};

export const Route = createFileRoute("/_dashboard/dashboard")({ component: Dashboard });

function Dashboard() {
  const { water, setWater, user } = useApp();
  const waterGoal = 8;
  const [progress, setProgress] = useState<ProgressDoc | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlanDoc | null>(null);
  const [recipes, setRecipes] = useState<RecipeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [progressData, mealPlans, recipeData] = await Promise.all([
          apiGet<ProgressDoc[]>("/progress"),
          apiGet<MealPlanDoc[]>("/meal-plans"),
          apiGet<RecipeDoc[]>("/recipes"),
        ]);

        if (!mounted) return;
        setProgress(progressData.find((item) => !user?._id || item.userId === user._id) || progressData[0] || null);
        setMealPlan(mealPlans.find((item) => !user?._id || item.userId === user._id) || mealPlans[0] || null);
        setRecipes(recipeData || []);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Failed to load dashboard data");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [user?._id]);

  const dayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayLabel = dayOrder[new Date().getDay()];
  const todayPlan = mealPlan?.days.find((day) => day.day === todayLabel) || mealPlan?.days[0] || null;

  const todayMeals = useMemo(() => {
    if (!todayPlan) return [];
    const mealTypes: Array<[string, { recipeId: string; portion: number }[]]> = [
      ["Breakfast", todayPlan.meals.breakfast || []],
      ["Lunch", todayPlan.meals.lunch || []],
      ["Dinner", todayPlan.meals.dinner || []],
    ];

    return mealTypes.flatMap(([meal, slots]) => slots.map((slot) => {
      const recipe = recipes.find((item) => item.externalId === slot.recipeId || item._id === slot.recipeId);
      if (!recipe) return null;
      return {
        meal,
        item: recipe.name,
        kcal: Math.round(recipe.calories * slot.portion),
        emoji: recipe.emoji || "🍽️",
        protein: recipe.macros.protein * slot.portion,
        carbs: recipe.macros.carbs * slot.portion,
        fat: recipe.macros.fat * slot.portion,
      };
    }).filter(Boolean)) as Array<{ meal: string; item: string; kcal: number; emoji: string; protein: number; carbs: number; fat: number }>;
  }, [recipes, todayPlan]);

  const dailyCalories = todayMeals.reduce((sum, meal) => sum + meal.kcal, 0);
  const dailyProtein = Math.round(todayMeals.reduce((sum, meal) => sum + meal.protein, 0));
  const dailyCarbs = Math.round(todayMeals.reduce((sum, meal) => sum + meal.carbs, 0));
  const dailyFat = Math.round(todayMeals.reduce((sum, meal) => sum + meal.fat, 0));

  const weeklyAverage = Math.round((progress?.weeklyProgress || []).reduce((sum, item) => sum + item.calories, 0) / Math.max(1, progress?.weeklyProgress?.length || 1));
  const weeklyTarget = Math.round((progress?.weeklyProgress || []).reduce((sum, item) => sum + item.target, 0) / Math.max(1, progress?.weeklyProgress?.length || 1));
  const weightTrend = useMemo(() => {
    const history = progress?.weightProgress || [];
    if (history.length < 2) return null;
    const change = history[history.length - 1].weight - history[0].weight;
    return { change: +Math.abs(change).toFixed(1), direction: change <= 0 ? "down" : "up", weeks: history.length };
  }, [progress?.weightProgress]);

  const macroSplit = progress?.macroSplit?.length
    ? progress.macroSplit
    : [
        { name: "Protein", value: 35, color: "var(--chart-1)" },
        { name: "Carbs", value: 45, color: "var(--chart-2)" },
        { name: "Fat", value: 20, color: "var(--chart-4)" },
      ];

  const calorieGoal = weeklyTarget || 2000;
  const macroGoals = {
    protein: Math.max(1, Math.round((calorieGoal * (macroSplit.find((item) => item.name === "Protein")?.value || 35)) / 100 / 4)),
    carbs: Math.max(1, Math.round((calorieGoal * (macroSplit.find((item) => item.name === "Carbs")?.value || 45)) / 100 / 4)),
    fat: Math.max(1, Math.round((calorieGoal * (macroSplit.find((item) => item.name === "Fat")?.value || 20)) / 100 / 9)),
  };

  const goalValue = dailyCalories <= calorieGoal ? "On track" : "Above target";
  const goalText = weightTrend ? `${weightTrend.direction === "down" ? "Down" : "Up"} ${weightTrend.change} kg in ${weightTrend.weeks} weeks` : `${weeklyAverage} kcal/day average`;

  const macros = [
    { label: "Protein", icon: Beef, value: dailyProtein, goal: macroGoals.protein, color: "var(--chart-1)" },
    { label: "Carbs", icon: Wheat, value: dailyCarbs, goal: macroGoals.carbs, color: "var(--chart-2)" },
    { label: "Fat", icon: Egg, value: dailyFat, goal: macroGoals.fat, color: "var(--chart-4)" },
  ];

  const titleName = user?.name?.split(" ")[0] || "there";

  return (
    <>
      <PageHeader title={`Good morning, ${titleName} 👋`} subtitle="Here's your nutrition snapshot for today."
        action={<Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> Log meal</Button>} />

      <div className="space-y-6 p-4 md:p-8">
        {loading && <Card className="p-6 text-muted-foreground">Loading dashboard...</Card>}
        {!loading && error && <Card className="p-6 text-destructive">{error}</Card>}

        {/* Top stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={Flame} label="Calories" value={`${dailyCalories.toLocaleString()} kcal`} goal={`${calorieGoal.toLocaleString()} kcal`} progress={(dailyCalories / calorieGoal) * 100} color="var(--chart-1)" delay={0} />
          <StatCard icon={Beef} label="Protein" value={`${dailyProtein}g`} goal={`${macroGoals.protein}g`} progress={(dailyProtein / macroGoals.protein) * 100} color="var(--chart-2)" delay={0.05} />
          <StatCard icon={Droplet} label="Water" value={`${water}`} goal={`${waterGoal} cups`} progress={(water/waterGoal)*100} color="var(--chart-3)" delay={0.1} />
          <StatCard icon={Target} label="Goal" value={goalValue} goal={goalText} progress={Math.min(100, (dailyCalories / calorieGoal) * 100)} color="var(--chart-5)" delay={0.15} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calories chart */}
          <Card className="p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">Weekly calories</h3>
                <p className="text-sm text-muted-foreground">Average {weeklyAverage.toLocaleString()} kcal/day</p>
              </div>
              <Badge variant="secondary" className="rounded-full"><TrendingUp className="mr-1 h-3 w-3" /> {weeklyTarget ? `${Math.round(((weeklyAverage - weeklyTarget) / weeklyTarget) * 100)}% vs target` : "No target"}</Badge>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={progress?.weeklyProgress || []}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="calories" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Macro split */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold">Macro split</h3>
            <p className="text-sm text-muted-foreground">Today's intake</p>
            <div className="mt-4 h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={macroSplit} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {macroSplit.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-2">
              {macroSplit.map(m => (
                <div key={m.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: m.color }} /> {m.name}</div>
                  <span className="font-medium">{m.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Macros + hydration */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <h3 className="mb-4 font-display text-lg font-semibold">Macronutrients</h3>
            <div className="space-y-4">
              {macros.map(m => (
                <div key={m.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2"><m.icon className="h-4 w-4" style={{ color: m.color }} /><span className="font-medium">{m.label}</span></div>
                    <span className="text-muted-foreground">{m.value}g <span className="text-xs">/ {m.goal}g</span></span>
                  </div>
                  <Progress value={(m.value/m.goal)*100} className="h-2" style={{ ["--progress-color" as any]: m.color }} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-1 font-display text-lg font-semibold">Hydration</h3>
            <p className="text-sm text-muted-foreground">Goal: {waterGoal} cups (2L)</p>
            <div className="my-4 grid grid-cols-4 gap-2">
              {Array.from({ length: waterGoal }).map((_, i) => (
                <button key={i} onClick={() => setWater(i + 1 === water ? i : i + 1)}
                  className={`aspect-square rounded-xl border-2 transition ${i < water ? "border-[color:var(--chart-3)] bg-[color:var(--chart-3)]/15 text-[color:var(--chart-3)]" : "border-border text-muted-foreground hover:border-[color:var(--chart-3)]/40"}`}>
                  <Droplet className="mx-auto h-5 w-5" fill={i < water ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setWater(Math.max(0, water - 1))}><Minus className="h-4 w-4" /></Button>
              <Button size="sm" className="flex-1" onClick={() => setWater(Math.min(waterGoal, water + 1))}><Plus className="h-4 w-4" /></Button>
            </div>
          </Card>
        </div>

        {/* Weight progress */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
                <h3 className="font-display text-lg font-semibold">Weight journey</h3>
              <p className="text-sm text-muted-foreground">{goalText}</p>
            </div>
            <Badge className="rounded-full bg-[color:var(--success)] text-primary-foreground">{goalValue}</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={progress?.weightProgress || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Bar dataKey="weight" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, goal, progress, color, delay }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-1 font-display text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">of {goal}</div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color }}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 h-1.5 rounded-full bg-muted">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, progress)}%`, background: color }} />
        </div>
      </Card>
    </motion.div>
  );
}
