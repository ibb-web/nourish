import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiGet } from "@/lib/api";

export const Route = createFileRoute("/_dashboard/food-database")({ component: FoodDB });

type Food = {
  _id: string;
  name: string;
  category: string;
  calories: number;
  serving: {
    amount?: number;
    unit?: string;
  };
  macros: { protein: number; carbs: number; fat: number };
  emoji?: string;
  source?: "manual" | "api";
  verified?: boolean;
};

function FoodDB() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const loadFoods = async () => {
      try {
        const query = q.trim();
        const endpoint = query ? `/foods/search?q=${encodeURIComponent(query)}` : "/foods";
        const data = await apiGet<Food[]>(endpoint);
        if (!mounted) return;
        setFoods(data || []);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Failed to load foods");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const timer = window.setTimeout(loadFoods, q.trim() ? 300 : 0);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [q]);

  const cats = ["All", ...Array.from(new Set(foods.map(f => f.category)))];
  const filtered = useMemo(() => foods.filter(f => cat === "All" || f.category === cat), [foods, cat]);

  return (
    <>
      <PageHeader title="Food database" subtitle="Search foods with detailed nutrition facts." />
      <div className="space-y-6 p-4 md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search foods…" value={q} onChange={e => setQ(e.target.value)} className="pl-10" />
          </div>
          <Button variant="outline"><Filter className="mr-1 h-4 w-4" /> Filters</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${cat === c ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-secondary"}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading && <p className="col-span-full py-12 text-center text-muted-foreground">Loading foods...</p>}
          {!loading && error && <p className="col-span-full py-12 text-center text-destructive">{error}</p>}
          {!loading && !error && filtered.map(f => (
            <Card key={f._id} className="p-5 transition-shadow hover:shadow-soft">
              <div className="flex items-start gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-xl bg-secondary text-3xl">{f.emoji || "🍽️"}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-display font-semibold">{f.name}</div>
                    <Badge variant="secondary" className="shrink-0">
                      {f.source === "manual" ? "Manual" : "USDA"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatServing(f.serving)} • {f.category}</div>
                  <div className="mt-1 font-display text-lg font-bold">{f.calories} <span className="text-xs font-normal text-muted-foreground">kcal</span></div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <Macro label="P" v={f.macros.protein} color="var(--chart-1)" />
                <Macro label="C" v={f.macros.carbs} color="var(--chart-2)" />
                <Macro label="F" v={f.macros.fat} color="var(--chart-4)" />
              </div>
            </Card>
          ))}
          {!loading && !error && !filtered.length && <p className="col-span-full py-12 text-center text-muted-foreground">No foods found.</p>}
        </div>
      </div>
    </>
  );
}

function formatServing(serving: Food["serving"]) {
  if (!serving) return "100 g";
  const amount = serving.amount ?? 100;
  const unit = serving.unit || "g";
  return `${amount} ${unit}`;
}

function Macro({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div className="rounded-lg bg-muted p-2">
      <div className="text-[10px] uppercase text-muted-foreground" style={{ color }}>{label}</div>
      <div className="font-semibold">{v}g</div>
    </div>
  );
}
