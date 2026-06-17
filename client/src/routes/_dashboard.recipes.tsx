import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Heart, Clock, Users, Bookmark, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useApp } from "@/context/AppContext";
import { apiGet, apiPatch } from "@/lib/api";

export const Route = createFileRoute("/_dashboard/recipes")({ component: Recipes });

type Recipe = {
  _id: string;
  externalId?: string;
  name: string;
  description: string;
  image?: string;
  sourceUrl?: string;
  time: number;
  servings: number;
  calories: number;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  emoji?: string;
  ingredients: { food: string; amount: string }[];
  steps: string[];
  macros: { protein: number; carbs: number; fat: number };
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

type RecipeSuggestion = {
  id: string;
  name: string;
  emoji?: string;
  tags?: string[];
};

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function recipeKey(recipe: Recipe) {
  return recipe.externalId || recipe._id;
}

function normalizeDay(value: string) {
  return days[new Date().getDay()] || value;
}

function Recipes() {
  const { favorites, toggleFavorite, bookmarks, toggleBookmark, user } = useApp();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [diet, setDiet] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [maxCalories, setMaxCalories] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (diet.trim()) params.set("diet", diet.trim());
    if (cuisine.trim()) params.set("cuisine", cuisine.trim());
    if (maxCalories.trim()) params.set("maxCalories", maxCalories.trim());
    params.set("page", String(page));
    params.set("limit", String(limit));
    return params.toString();
  }, [query, diet, cuisine, maxCalories, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [query, diet, cuisine, maxCalories]);

  useEffect(() => {
    let mounted = true;
    const loadRecipes = async () => {
      try {
        const data = await apiGet<Recipe[]>(searchParams ? `/recipes/search?${searchParams}` : "/recipes/search");
        if (!mounted) return;
        setRecipes(data || []);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Failed to load recipes");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const timer = window.setTimeout(loadRecipes, 250);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [searchParams]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const data = await apiGet<RecipeSuggestion[]>(`/recipes/search/suggestions?q=${encodeURIComponent(q)}&limit=8`);
        if (!active) return;
        setSuggestions(Array.isArray(data) ? data : []);
      } catch {
        if (!active) return;
        setSuggestions([]);
      }
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const addToPlanner = async (recipe: Recipe) => {
    try {
      const plans = await apiGet<MealPlanDoc[]>("/meal-plans");
      const selected = user?._id ? plans.find((plan) => plan.userId === user._id) || plans[0] || null : plans[0] || null;
      if (!selected) return;

      const today = normalizeDay("");
      const nextDays = selected.days.map((day) => {
        if (day.day !== today) return day;
        return {
          ...day,
          meals: {
            ...day.meals,
            breakfast: [...(day.meals.breakfast || []), { recipeId: recipeKey(recipe), portion: 1 }],
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

  return (
    <>
      <PageHeader title="Recipes" subtitle="Hand-picked, dietitian-approved meals." />
      <div className="space-y-4 p-4 md:p-8">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recipes"
              className="pl-10"
            />
            {showSuggestions && suggestions.length > 0 ? (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow-soft">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setQuery(s.name);
                      setShowSuggestions(false);
                    }}
                  >
                    <span className="truncate">{s.emoji || "🍽️"} {s.name}</span>
                    <span className="ml-2 truncate text-xs text-muted-foreground">{(s.tags || []).slice(0, 2).join(", ")}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Input value={diet} onChange={(e) => setDiet(e.target.value)} placeholder="Diet e.g. vegetarian" />
          <Input value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="Cuisine e.g. italian" />
          <Input value={maxCalories} onChange={(e) => setMaxCalories(e.target.value)} placeholder="Max calories" />
        </div>
      </div>
      <div className="grid gap-5 p-4 sm:grid-cols-2 md:p-8 lg:grid-cols-3">
        {loading && <p className="col-span-full py-12 text-center text-muted-foreground">Loading recipes...</p>}
        {!loading && error && <p className="col-span-full py-12 text-center text-destructive">{error}</p>}
        {!loading && !error && recipes.map(r => (
          <Card key={r._id} className="group overflow-hidden p-0 transition-shadow hover:shadow-soft">
            <Link to="/recipe/$id" params={{ id: recipeKey(r) }} className="block">
              <div className="relative aspect-[4/3] overflow-hidden gradient-hero">
                {r.image ? (
                  <img src={r.image} alt={r.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-7xl">{r.emoji || "🍽️"}</div>
                )}
                <div className="absolute right-3 top-3 flex gap-1.5">
                  <button onClick={(e) => { e.preventDefault(); toggleBookmark(recipeKey(r)); }}
                    className="grid h-8 w-8 place-items-center rounded-full bg-background/90 backdrop-blur transition hover:scale-110">
                    <Bookmark className={`h-4 w-4 ${bookmarks.includes(recipeKey(r)) ? "fill-foreground" : ""}`} />
                  </button>
                  <button onClick={(e) => { e.preventDefault(); toggleFavorite(recipeKey(r)); }}
                    className="grid h-8 w-8 place-items-center rounded-full bg-background/90 backdrop-blur transition hover:scale-110">
                    <Heart className={`h-4 w-4 ${favorites.includes(recipeKey(r)) ? "fill-destructive text-destructive" : ""}`} />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <div className="flex flex-wrap gap-1.5">
                  {r.tags.map(t => <Badge key={t} variant="secondary" className="rounded-full text-xs">{t}</Badge>)}
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold">{r.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {r.time} min</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {r.servings}</span>
                  <span className="font-semibold text-foreground">{r.calories} kcal</span>
                  <span className="text-right font-medium text-foreground">P {r.macros.protein}g</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-muted p-2"><div className="text-[10px] uppercase text-muted-foreground">P</div><div className="font-semibold">{r.macros.protein}g</div></div>
                  <div className="rounded-lg bg-muted p-2"><div className="text-[10px] uppercase text-muted-foreground">C</div><div className="font-semibold">{r.macros.carbs}g</div></div>
                  <div className="rounded-lg bg-muted p-2"><div className="text-[10px] uppercase text-muted-foreground">F</div><div className="font-semibold">{r.macros.fat}g</div></div>
                </div>
                <Button type="button" size="sm" variant="secondary" className="mt-4 w-full" onClick={(e) => { e.preventDefault(); void addToPlanner(r); }}>
                  <Plus className="mr-1 h-4 w-4" /> Add to planner
                </Button>
              </div>
            </Link>
          </Card>
        ))}
        {!loading && !error && !recipes.length && <p className="col-span-full py-12 text-center text-muted-foreground">No recipes found.</p>}
      </div>
      <div className="flex items-center justify-center gap-2 px-4 pb-8 md:px-8">
        <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <Button variant="outline" size="sm" disabled={loading || recipes.length < limit} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </>
  );
}
