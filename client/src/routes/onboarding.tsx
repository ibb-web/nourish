import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { apiPatch } from "@/lib/api";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

type Data = {
  goal?: string;
  diet?: string;
  allergies: string[];
  weight?: number;
  height?: number;
  activity?: string;
  meals?: number;
};

const goals = [
  { id: "lose", label: "Lose weight", emoji: "⚖️" },
  { id: "maintain", label: "Maintain", emoji: "🌿" },
  { id: "gain", label: "Build muscle", emoji: "💪" },
  { id: "health", label: "Eat healthier", emoji: "🥗" },
];
const diets = [
  { id: "balanced", label: "Balanced", emoji: "🍽️" },
  { id: "vegetarian", label: "Vegetarian", emoji: "🥕" },
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "keto", label: "Keto", emoji: "🥑" },
  { id: "paleo", label: "Paleo", emoji: "🍖" },
  { id: "mediterranean", label: "Mediterranean", emoji: "🫒" },
];
const allergyOptions = ["Dairy", "Gluten", "Nuts", "Shellfish", "Eggs", "Soy"];
const activities = [
  { id: "sedentary", label: "Sedentary", desc: "Little to no exercise" },
  { id: "light", label: "Light", desc: "1–3 days/week" },
  { id: "moderate", label: "Moderate", desc: "3–5 days/week" },
  { id: "active", label: "Active", desc: "6–7 days/week" },
];

function Onboarding() {
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Data>({ allergies: [] });
  const steps = ["Goal", "Diet", "Allergies", "Body", "Activity", "Meals"];
  const progress = ((step + 1) / steps.length) * 100;

  const next = () => step < steps.length - 1 ? setStep(s => s + 1) : finish();
  const finish = async () => {
    try {
      if (user?._id) {
        const updated = await apiPatch<any>(`/users/${user._id}`, {
          goal: data.goal,
          diet: data.diet,
          allergies: data.allergies,
          weight: data.weight,
          height: data.height,
          activity: data.activity,
          mealsPerDay: data.meals,
          onboardingCompleted: true,
        });
        setUser(updated);
      }
      toast.success("You're all set!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save onboarding");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary text-primary-foreground"><ChefHat className="h-5 w-5" /></div>
            <span className="font-display text-lg font-bold">Nourish</span>
          </Link>
          <div className="text-sm text-muted-foreground">Step {step + 1} of {steps.length}</div>
        </div>
        <div className="container mx-auto px-4 pb-4"><Progress value={progress} className="h-1.5" /></div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-12">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <Card className="p-8 md:p-10">
              {step === 0 && (
                <Step title="What's your main goal?" subtitle="We'll tailor your plan around it.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {goals.map(g => (
                      <Option key={g.id} active={data.goal === g.id} onClick={() => setData({ ...data, goal: g.id })}>
                        <span className="text-2xl">{g.emoji}</span><span className="font-medium">{g.label}</span>
                      </Option>
                    ))}
                  </div>
                </Step>
              )}
              {step === 1 && (
                <Step title="Choose your eating style" subtitle="You can change this anytime.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {diets.map(d => (
                      <Option key={d.id} active={data.diet === d.id} onClick={() => setData({ ...data, diet: d.id })}>
                        <span className="text-2xl">{d.emoji}</span><span className="font-medium">{d.label}</span>
                      </Option>
                    ))}
                  </div>
                </Step>
              )}
              {step === 2 && (
                <Step title="Any allergies or restrictions?" subtitle="We'll skip these in your meal plans.">
                  <div className="flex flex-wrap gap-2">
                    {allergyOptions.map(a => {
                      const active = data.allergies.includes(a);
                      return (
                        <button key={a} type="button"
                          onClick={() => setData({ ...data, allergies: active ? data.allergies.filter(x => x !== a) : [...data.allergies, a] })}
                          className={`rounded-full border px-4 py-2 text-sm transition ${active ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary"}`}>
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </Step>
              )}
              {step === 3 && (
                <Step title="Tell us about you" subtitle="Used to calculate your daily targets.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label>Weight (kg)</Label><Input type="number" className="mt-1.5" placeholder="70" value={data.weight ?? ""} onChange={e => setData({ ...data, weight: +e.target.value })} /></div>
                    <div><Label>Height (cm)</Label><Input type="number" className="mt-1.5" placeholder="175" value={data.height ?? ""} onChange={e => setData({ ...data, height: +e.target.value })} /></div>
                  </div>
                </Step>
              )}
              {step === 4 && (
                <Step title="How active are you?" subtitle="Pick the closest match.">
                  <div className="space-y-3">
                    {activities.map(a => (
                      <Option key={a.id} active={data.activity === a.id} onClick={() => setData({ ...data, activity: a.id })} className="flex-row justify-between">
                        <div><div className="font-medium">{a.label}</div><div className="text-sm text-muted-foreground">{a.desc}</div></div>
                        {data.activity === a.id && <Check className="h-5 w-5 text-primary" />}
                      </Option>
                    ))}
                  </div>
                </Step>
              )}
              {step === 5 && (
                <Step title="How many meals per day?" subtitle="We'll structure your plan accordingly.">
                  <div className="grid grid-cols-4 gap-3">
                    {[2,3,4,5].map(n => (
                      <Option key={n} active={data.meals === n} onClick={() => setData({ ...data, meals: n })} className="aspect-square justify-center">
                        <span className="font-display text-3xl font-bold">{n}</span>
                      </Option>
                    ))}
                  </div>
                </Step>
              )}
              <div className="mt-10 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button onClick={next} className="rounded-full">
                  {step === steps.length - 1 ? "Finish" : "Continue"} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function Option({ active, onClick, children, className = "" }: { active?: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"} ${className}`}>
      {children}
    </button>
  );
}
