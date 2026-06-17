import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, Fragment, useEffect } from "react";
import { Heart, Printer, Plus, GripVertical, X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useApp } from "@/context/AppContext";
import { apiGet, apiPatch } from "@/lib/api";

export const Route = createFileRoute("/_dashboard/meal-planner")({ component: MealPlanner });

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const mealTypes = ["Breakfast", "Lunch", "Dinner"] as const;

type Slot = { id: string; recipeId: string; portion: number };
type Plan = Record<string, Record<string, Slot[]>>;
type Recipe = { _id: string; externalId?: string; name: string; calories: number; emoji?: string };
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

function makeEmptyPlan(): Plan {
  const plan: Plan = {};
  days.forEach((d) => {
    plan[d] = {};
    mealTypes.forEach((m) => {
      plan[d][m] = [];
    });
  });
  return plan;
}

const dayMap: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

function normalizeDay(value: string) {
  return dayMap[(value || "").slice(0, 3).toLowerCase()] || "Mon";
}

function toPlan(doc: MealPlanDoc | null): Plan {
  const plan = makeEmptyPlan();
  if (!doc) return plan;

  doc.days.forEach((d) => {
    const day = normalizeDay(d.day);
    plan[day].Breakfast = (d.meals?.breakfast || []).map((s, idx) => ({
      id: `${day}-Breakfast-${s.recipeId}-${idx}`,
      recipeId: s.recipeId,
      portion: s.portion,
    }));
    plan[day].Lunch = (d.meals?.lunch || []).map((s, idx) => ({
      id: `${day}-Lunch-${s.recipeId}-${idx}`,
      recipeId: s.recipeId,
      portion: s.portion,
    }));
    plan[day].Dinner = (d.meals?.dinner || []).map((s, idx) => ({
      id: `${day}-Dinner-${s.recipeId}-${idx}`,
      recipeId: s.recipeId,
      portion: s.portion,
    }));
  });

  return plan;
}

function recipeKey(recipe: Recipe) {
  return recipe.externalId || recipe._id;
}

function recipeLookupKey(slotRecipeId: string, recipe: Recipe) {
  return recipe.externalId === slotRecipeId || recipe._id === slotRecipeId;
}

function getMondayOfWeek(offset: number): Date {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekLabel(offset: number): string {
  if (offset === 0) return "This week";
  const monday = getMondayOfWeek(offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

function MealPlanner() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan>(makeEmptyPlan);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [allMealPlans, setAllMealPlans] = useState<MealPlanDoc[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mealPlanId, setMealPlanId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const { favorites, toggleFavorite, user } = useApp();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const serializePlan = (nextPlan: Plan) => days.map((day) => ({
    day,
    meals: {
      breakfast: nextPlan[day].Breakfast.map((slot) => ({ recipeId: slot.recipeId, portion: slot.portion })),
      lunch: nextPlan[day].Lunch.map((slot) => ({ recipeId: slot.recipeId, portion: slot.portion })),
      dinner: nextPlan[day].Dinner.map((slot) => ({ recipeId: slot.recipeId, portion: slot.portion })),
    },
  }));

  const persistPlan = async (nextPlan: Plan) => {
    if (!mealPlanId) return;
    try {
      await apiPatch(`/meal-plans/${mealPlanId}`, {
        weekStart: weekStart || new Date().toISOString(),
        days: serializePlan(nextPlan),
      });
    } catch (err: any) {
      setError(err?.message || "Failed to save meal plan");
    }
  };

  // Load recipes and all meal plans once on mount / user change
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [recipesData, mealPlans] = await Promise.all([
          apiGet<Recipe[]>("/recipes"),
          apiGet<MealPlanDoc[]>("/meal-plans"),
        ]);

        if (!mounted) return;

        setRecipes(recipesData || []);
        setAllMealPlans(mealPlans || []);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Failed to load meal plan");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [user?._id]);

  // Select the right plan whenever weekOffset or allMealPlans changes
  useEffect(() => {
    if (!allMealPlans.length) {
      if (weekOffset !== 0) {
        setPlan(makeEmptyPlan());
        setMealPlanId(null);
        setWeekStart(null);
      }
      return;
    }

    const targetMonday = getMondayOfWeek(weekOffset);
    const matched = allMealPlans.find((p) => {
      if (!p.weekStart) return false;
      const d = new Date(p.weekStart);
      return Math.abs(d.getTime() - targetMonday.getTime()) < 24 * 3600 * 1000;
    });

    // For current week fall back to the user's plan; other weeks show empty if no match
    const fallback =
      weekOffset === 0
        ? (user?._id ? allMealPlans.find((p) => p.userId === user._id) : allMealPlans[0]) ||
          allMealPlans[0] ||
          null
        : null;

    const selected = matched || fallback;
    setMealPlanId(selected?._id || null);
    setWeekStart(selected?.weekStart || null);
    setPlan(toPlan(selected || null));
  }, [weekOffset, allMealPlans, user?._id]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const [day, meal] = (active.id as string).split("|");
    const items = plan[day][meal];
    const oldIdx = items.findIndex(i => i.id === active.id.toString().split("|")[2]);
    const newIdx = items.findIndex(i => i.id === over.id.toString().split("|")[2]);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = { ...plan, [day]: { ...plan[day], [meal]: arrayMove(items, oldIdx, newIdx) } };
    setPlan(next);
    void persistPlan(next);
  };

  const removeSlot = (day: string, meal: string, id: string) => {
    const next = { ...plan, [day]: { ...plan[day], [meal]: plan[day][meal].filter(s => s.id !== id) } };
    setPlan(next);
    void persistPlan(next);
  };

  const addRandom = (day: string, meal: string) => {
    if (!recipes.length) return;
    const r = recipes[Math.floor(Math.random() * recipes.length)];
    const id = `${day}-${meal}-${r._id}-${Date.now()}`;
    const next = { ...plan, [day]: { ...plan[day], [meal]: [...plan[day][meal], { id, recipeId: recipeKey(r), portion: 1 }] } };
    setPlan(next);
    void persistPlan(next);
  };

  const changePortion = (day: string, meal: string, id: string, d: number) => {
    const next = { ...plan, [day]: { ...plan[day], [meal]: plan[day][meal].map(s => s.id === id ? { ...s, portion: Math.max(0.5, Math.min(4, s.portion + d)) } : s) } };
    setPlan(next);
    void persistPlan(next);
  };

  const dayCalories = (day: string) => mealTypes.reduce((sum, m) =>
    sum + plan[day][m].reduce((s, slot) => {
      const recipe = recipes.find(r => recipeLookupKey(slot.recipeId, r));
      return s + ((recipe?.calories || 0) * slot.portion);
    }, 0), 0);

  return (
    <>
      <PageHeader title="Weekly meal planner" subtitle="Drag to reorder. Click ＋ to add. Print for the fridge."
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setWeekOffset((o) => o - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => setWeekOffset(0)}>
              {getWeekLabel(weekOffset)}
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => setWeekOffset((o) => o + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> Print
            </Button>
          </div>
        } />

      <div className="overflow-x-auto p-4 md:p-8">
        {loading && <Card className="mb-4 p-4 text-muted-foreground">Loading meal plan...</Card>}
        {!loading && error && <Card className="mb-4 p-4 text-destructive">{error}</Card>}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div className="grid min-w-[1100px] grid-cols-[100px_repeat(7,1fr)] gap-3">
            <div />
            {days.map(d => (
              <div key={d} className="px-2 text-center">
                <div className="font-display text-sm font-semibold">{d}</div>
                <div className="text-xs text-muted-foreground">{Math.round(dayCalories(d))} kcal</div>
              </div>
            ))}
            {mealTypes.map(meal => (
              <Fragment key={meal}>
                <div className="flex items-center font-display text-sm font-semibold text-muted-foreground">{meal}</div>
                {days.map(day => (
                  <Card key={`${day}-${meal}`} className="min-h-[140px] p-2">
                    <SortableContext items={plan[day][meal].map(s => `${day}|${meal}|${s.id}`)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {plan[day][meal].map(slot => {
                          const r = recipes.find(x => recipeLookupKey(slot.recipeId, x));
                          if (!r) return null;
                          const recipeId = recipeKey(r);
                          return <SlotCard key={slot.id} id={`${day}|${meal}|${slot.id}`} recipeId={recipeId} onOpen={() => navigate({ to: "/recipe/$id", params: { id: recipeId } })} recipe={r} portion={slot.portion}
                            fav={favorites.includes(recipeId)} onFav={() => toggleFavorite(recipeId)}
                            onRemove={() => removeSlot(day, meal, slot.id)}
                            onPortion={(d: number) => changePortion(day, meal, slot.id, d)} />;
                        })}
                      </div>
                    </SortableContext>
                    <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => addRandom(day, meal)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </Fragment>
            ))}
          </div>
        </DndContext>
      </div>
    </>
  );
}

function SlotCard({ id, recipeId, onOpen, recipe, portion, fav, onFav, onRemove, onPortion }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(); } }} className="group relative rounded-lg border bg-card p-2 text-xs transition hover:border-primary/50 hover:shadow-sm">
      <div className="flex items-start gap-1.5">
        <button {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} className="mt-0.5 cursor-grab text-muted-foreground active:cursor-grabbing">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <span className="text-base leading-none">{recipe.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="truncate font-medium">{recipe.name}</div>
          <div className="text-[10px] text-muted-foreground">{Math.round(recipe.calories * portion)} kcal</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="opacity-0 transition group-hover:opacity-100"><X className="h-3 w-3" /></button>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onPortion(-0.5); }} className="grid h-5 w-5 place-items-center rounded border hover:bg-muted">-</button>
          <span className="text-[10px] font-medium">{portion}x</span>
          <button onClick={(e) => { e.stopPropagation(); onPortion(0.5); }} className="grid h-5 w-5 place-items-center rounded border hover:bg-muted">+</button>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onFav(); }}>
          <Heart className={`h-3.5 w-3.5 ${fav ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
        </button>
      </div>
    </div>
  );
}
