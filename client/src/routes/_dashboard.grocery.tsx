import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Printer, Share2, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/grocery")({ component: Grocery });

type GroceryListDoc = {
  _id: string;
  userId: string;
  categories: Array<{
    name: string;
    items: Array<{ name: string; qty: string; checked?: boolean }>;
  }>;
};

function Grocery() {
  const { user } = useApp();
  const [groceryLists, setGroceryLists] = useState<GroceryListDoc[]>([]);
  const [groceryListId, setGroceryListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadGrocery = async () => {
      try {
        const data = await apiGet<GroceryListDoc[]>("/grocery-lists");
        if (!mounted) return;
        setGroceryLists(data || []);
        const selected = user?._id ? data.find((g) => g.userId === user._id) || data[0] || null : data[0] || null;
        setGroceryListId(selected?._id || null);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Failed to load grocery list");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadGrocery();
    return () => {
      mounted = false;
    };
  }, []);

  const selected = useMemo(() => {
    if (!groceryLists.length) return null;
    return user?._id ? groceryLists.find((g) => g.userId === user._id) || groceryLists[0] : groceryLists[0];
  }, [groceryLists, user?._id]);

  const total = selected?.categories.reduce((sum, cat) => sum + (cat.items?.length || 0), 0) || 0;
  const checkedCount = selected?.categories.reduce((sum, cat) => sum + (cat.items || []).filter((item) => item.checked).length, 0) || 0;

  const toggle = async (categoryName: string, itemName: string) => {
    if (!selected || !groceryListId) return;

    const nextLists = groceryLists.map((list) => {
      if (list._id !== groceryListId) return list;
      return {
        ...list,
        categories: list.categories.map((category) => {
          if (category.name !== categoryName) return category;
          return {
            ...category,
            items: category.items.map((item) => item.name === itemName ? { ...item, checked: !item.checked } : item),
          };
        }),
      };
    });

    setGroceryLists(nextLists);

    const nextSelected = nextLists.find((item) => item._id === groceryListId);
    if (!nextSelected) return;

    try {
      await apiPatch(`/grocery-lists/${groceryListId}`, nextSelected);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to save grocery list");
    }
  };

  const regenerate = async () => {
    if (!groceryListId || regenerating) return;
    setRegenerating(true);
    try {
      await apiDelete(`/grocery-lists/${groceryListId}`);
      const data = await apiGet<GroceryListDoc[]>("/grocery-lists");
      setGroceryLists(data || []);
      const sel = user?._id ? data.find((g) => g.userId === user._id) || data[0] : data[0];
      setGroceryListId(sel?._id || null);
      setError(null);
      toast.success("Grocery list regenerated from your meal plan");
    } catch (err: any) {
      setError(err?.message || "Failed to regenerate grocery list");
    } finally {
      setRegenerating(false);
    }
  };

  const share = async () => {
    if (!selected) return;
    const text = selected.categories
      .flatMap((c) => [`${c.name}:`, ...c.items.map((i) => `  • ${i.name} (${i.qty})`)])
      .join("\n");
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Grocery List", text });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`Grocery List\n\n${text}`);
        toast.success("Copied to clipboard!");
      } catch {
        toast.error("Could not copy to clipboard");
      }
    }
  };

  return (
    <>
      <PageHeader title="Grocery list" subtitle={`${checkedCount} of ${total} items checked • generated from this week's meal plan`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={regenerate} disabled={regenerating}>
              <RefreshCw className={`mr-1 h-4 w-4 ${regenerating ? "animate-spin" : ""}`} /> Regenerate
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> Print
            </Button>
            <Button className="rounded-full" onClick={share}>
              <Share2 className="mr-1 h-4 w-4" /> Share
            </Button>
          </div>
        } />
      {loading && <div className="px-4 text-sm text-muted-foreground md:px-8">Loading grocery list...</div>}
      {!loading && error && <div className="px-4 text-sm text-destructive md:px-8">{error}</div>}
      <div className="grid gap-6 p-4 md:grid-cols-2 md:p-8 lg:grid-cols-3">
        {(selected?.categories || []).map((category) => (
          <Card key={category.name} className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display font-semibold">{category.name}</h3>
              <Badge variant="secondary" className="rounded-full">{category.items.length}</Badge>
            </div>
            <ul className="space-y-1.5">
              {category.items.map((item) => {
                const isChecked = !!item.checked;
                return (
                  <li key={`${category.name}-${item.name}`}>
                    <button onClick={() => toggle(category.name, item.name)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted">
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition ${isChecked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                        {isChecked && <Check className="h-3 w-3" />}
                      </span>
                      <span className={`flex-1 text-sm ${isChecked ? "text-muted-foreground line-through" : ""}`}>{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.qty}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
        {!loading && !error && !total && <p className="col-span-full text-muted-foreground">No grocery items found.</p>}
      </div>
    </>
  );
}
