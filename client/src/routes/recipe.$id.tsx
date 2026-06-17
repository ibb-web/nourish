import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bookmark, Clock, Flame, Heart, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/AppContext";
import { apiGet, apiPatch } from "@/lib/api";

export const Route = createFileRoute("/recipe/$id")({ component: RecipeDetail });

type Recipe = {
  _id: string;
  externalId?: string;
  name: string;
  description: string;
  image?: string;
  sourceUrl?: string;
  time: number;
  preparationTime?: number | null;
  cookingTime?: number | null;
  servings: number;
  calories: number;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  emoji?: string;
  ingredients: { food: string; amount: string }[];
  steps: string[];
  macros: { protein: number; carbs: number; fat: number };
  cuisines?: string[];
  diets?: string[];
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

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function recipeKey(recipe: Recipe) {
  return recipe.externalId || recipe._id;
}

function RecipeDetail() {
  const { id } = useParams({ from: "/recipe/$id" });
  const { favorites, toggleFavorite, bookmarks, toggleBookmark, user } = useApp();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadRecipe = async () => {
      try {
        const data = await apiGet<Recipe>(`/recipes/${id}`);
        if (!mounted) return;
        setRecipe(data);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Failed to load recipe");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadRecipe();
    return () => {
      mounted = false;
    };
  }, [id]);

  const addToPlanner = async () => {
    if (!recipe) return;
    try {
      const plans = await apiGet<MealPlanDoc[]>('/meal-plans');
      const selected = user?._id ? plans.find((plan) => plan.userId === user._id) || plans[0] || null : plans[0] || null;
      if (!selected) return;

      const today = weekDays[new Date().getDay()];
      const nextDays = selected.days.map((day) => {
        if (day.day !== today) return day;
        return {
          ...day,
          meals: {
            ...day.meals,
            lunch: [...(day.meals.lunch || []), { recipeId: recipeKey(recipe), portion: 1 }],
          },
        };
      });

      await apiPatch(`/meal-plans/${selected._id}`, {
        weekStart: selected.weekStart,
        days: nextDays,
      });
    } catch (err) {
      console.error("Failed to add recipe to planner", err);
    }
  };

  if (loading) return (
    <div className="p-6">
      <div className="mb-4 h-56 w-full animate-pulse rounded-md bg-muted" />
      <div className="space-y-3">
        <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-4 gap-3">
          <div className="h-20 animate-pulse rounded bg-muted" />
          <div className="h-20 animate-pulse rounded bg-muted" />
          <div className="h-20 animate-pulse rounded bg-muted" />
          <div className="h-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );

  if (error || !recipe) return (
    <div className="p-8">
      <p>{error || 'Recipe not found.'}</p>
      <div className="mt-4">
        <Button variant="secondary" onClick={() => window.history.back()}>Back</Button>
      </div>
    </div>
  );

  const r = recipe;
  const key = recipeKey(r);

  return (
    <div>
      <div className="relative grid aspect-[16/6] place-items-center overflow-hidden gradient-hero">
        {r.image ? <img src={r.image} alt={r.name} className="h-full w-full object-cover" /> : <div className="text-9xl">{r.emoji || '🍽️'}</div>}
        <Button variant="secondary" className="absolute left-4 top-4 rounded-full" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>
      <div className="container mx-auto max-w-5xl px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-1.5">{(r.tags || []).map((t) => <Badge key={t} variant="secondary" className="rounded-full">{t}</Badge>)}</div>
            <h1 className="mt-3 font-display text-4xl font-bold">{r.name}</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">{r.description}</p>
            {r.sourceUrl && <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary underline">View source</a>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => toggleBookmark(key)}>
              <Bookmark className={`mr-1 h-4 w-4 ${bookmarks.includes(key) ? 'fill-foreground' : ''}`} />
              {bookmarks.includes(key) ? 'Saved' : 'Save'}
            </Button>
            <Button className="rounded-full" onClick={() => toggleFavorite(key)}>
              <Heart className={`mr-1 h-4 w-4 ${favorites.includes(key) ? 'fill-current' : ''}`} />
              {favorites.includes(key) ? 'Favorited' : 'Favorite'}
            </Button>
            <Button variant="secondary" className="rounded-full" onClick={addToPlanner}>
              <Plus className="mr-1 h-4 w-4" /> Add to planner
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <Stat icon={Clock} label="Prep" value={r.preparationTime ? `${r.preparationTime} min` : (r.time ? `${r.time} min` : '—')} />
          <Stat icon={Clock} label="Cook" value={r.cookingTime ? `${r.cookingTime} min` : '—'} />
          <Stat icon={Users} label="Servings" value={`${r.servings}`} />
          <Stat icon={Flame} label="Calories" value={r.calories ? `${r.calories}` : '—'} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-1">
            <h3 className="font-display text-lg font-semibold">Ingredients</h3>
            <ul className="mt-4 space-y-2">
              {r.ingredients.map((i, idx) => (
                <li key={idx} className="flex items-start gap-2 border-b py-2 text-sm last:border-0">
                  <span className="text-primary">•</span>
                  <span className="flex-1">{i.amount ? `${i.amount} ${i.food}` : i.food}</span>
                </li>
              ))}
            </ul>
            {(r.cuisines && r.cuisines.length) || (r.diets && r.diets.length) ? (
              <div className="mt-6">
                {r.cuisines && r.cuisines.length ? (<div className="text-sm text-muted-foreground">Cuisine: <strong className="text-foreground">{r.cuisines.join(', ')}</strong></div>) : null}
                {r.diets && r.diets.length ? (<div className="text-sm text-muted-foreground">Diet: <strong className="text-foreground">{r.diets.join(', ')}</strong></div>) : null}
              </div>
            ) : null}
            <div className="mt-6 rounded-xl bg-muted p-4">
              <h4 className="text-sm font-semibold">Nutrition (per serving)</h4>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div><div className="font-display text-lg font-bold">{r.macros.protein}g</div><div className="text-xs text-muted-foreground">Protein</div></div>
                <div><div className="font-display text-lg font-bold">{r.macros.carbs}g</div><div className="text-xs text-muted-foreground">Carbs</div></div>
                <div><div className="font-display text-lg font-bold">{r.macros.fat}g</div><div className="text-xs text-muted-foreground">Fat</div></div>
              </div>
            </div>
          </Card>
          <Card className="p-6 lg:col-span-2">
            <h3 className="font-display text-lg font-semibold">Instructions</h3>
            <ol className="mt-4 space-y-4">
              {r.steps.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">{i + 1}</span>
                  <p className="pt-1">{s}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <Card className="p-4 text-center">
      {Icon && <Icon className="mx-auto mb-1 h-5 w-5 text-primary" />}
      <div className="font-display text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}