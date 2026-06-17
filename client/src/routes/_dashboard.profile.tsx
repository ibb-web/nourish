import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { Bell, Shield, User as UserIcon, Salad } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { useApp } from "@/context/AppContext";

import { toast } from "sonner";

import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  setToken,
} from "@/lib/api";

export const Route = createFileRoute("/_dashboard/profile")({ component: Profile });

const diets = ["Balanced", "Vegetarian", "Vegan", "Keto", "Paleo", "Mediterranean"];
const allergies = ["Dairy", "Gluten", "Nuts", "Shellfish", "Eggs", "Soy"];

function Profile() {
  const { user, setUser } = useApp();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [diet, setDiet] = useState(user?.diet || "balanced");
  const [picked, setPicked] = useState<string[]>(user?.allergies || []);
  const [prefs, setPrefs] = useState(user?.notifications || { meal: true, water: true, weekly: false, promo: false });
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [newType, setNewType] = useState("meal_reminder");
  const [newSchedule, setNewSchedule] = useState("daily:08:00");
  const [testEmail, setTestEmail] = useState(user?.email || "");

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const list = await apiGet<any[]>("/notifications");
      setNotifications(Array.isArray(list) ? list : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load notifications");
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!user?._id) {
      toast.error("Please sign in first");
      return;
    }
    try {
      const updated = await apiPatch(`/users/${user._id}`, {
        name,
        email,
        diet,
        allergies: picked,
        notifications: prefs,
        avatar,
      });
      setUser({ ...user, ...updated });
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings");
    }
  };

  const exportData = async () => {
    if (!user?._id) return;
    try {
      const [userData, mealPlans, progress, groceryLists] = await Promise.all([
        apiGet(`/users/${user._id}`),
        apiGet("/meal-plans"),
        apiGet("/progress"),
        apiGet("/grocery-lists"),
      ]);
      const blob = new Blob(
        [JSON.stringify({ user: userData, mealPlans, progress, groceryLists }, null, 2)],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nourish-export.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported!");
    } catch {
      toast.error("Export failed");
    }
  };

  const deleteAccount = async () => {
    if (!user?._id) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This cannot be undone."
    );
    if (!confirmed) return;
    try {
      await apiDelete(`/users/${user._id}`);
      setToken(null);
      setUser(null);
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete account");
    }
  };

  const createNotification = async () => {
    try {
      await apiPost("/notifications", {
        type: newType,
        enabled: true,
        schedule: newSchedule,
      });
      toast.success("Notification rule created");
      loadNotifications();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create notification");
    }
  };

  const removeNotification = async (id: string) => {
    try {
      await apiDelete(`/notifications/${id}`);
      toast.success("Notification deleted");
      setNotifications((curr) => curr.filter((n) => n._id !== id));
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete notification");
    }
  };

  const sendTestNotificationEmail = async () => {
    try {
      await apiPost("/notifications/send-test", { to: testEmail || undefined });
      toast.success("Test email sent");
    } catch (error: any) {
      toast.error(error?.message || "Failed to send test email");
    }
  };

  const runSchedulerTick = async () => {
    try {
      await apiPost("/notifications/run-tick", {});
      toast.success("Scheduler tick executed");
      loadNotifications();
    } catch (error: any) {
      toast.error(error?.message || "Failed to run scheduler tick");
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your profile, preferences and notifications."
        action={<Button className="rounded-full" onClick={saveProfile}>Save changes</Button>} />
      <div className="space-y-6 p-4 md:p-8">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-3xl">
              {avatar
                ? <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                : "👤"}
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl font-semibold">{user?.name}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="mt-2 rounded-full">{user?.subscriptionTier || "Starter"} member</Badge>
            </div>
            <Button variant="outline" onClick={() => avatarInputRef.current?.click()}>Edit avatar</Button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </Card>

        <Section icon={UserIcon} title="Account">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" /></div>
            <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
            <div><Label>Age</Label><Input type="number" defaultValue={29} className="mt-1.5" /></div>
            <div><Label>Timezone</Label><Input defaultValue="UTC+1" className="mt-1.5" /></div>
          </div>
        </Section>

        <Section icon={Salad} title="Dietary preferences">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Eating style</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {diets.map(d => (
                <button key={d} onClick={() => setDiet(d.toLowerCase())}
                  className={`rounded-full border px-4 py-1.5 text-sm transition ${diet.toLowerCase() === d.toLowerCase() ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary"}`}>{d}</button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <Label className="text-xs uppercase text-muted-foreground">Allergies & restrictions</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {allergies.map(a => {
                const on = picked.includes(a);
                return (
                  <button key={a} onClick={() => setPicked(p => on ? p.filter(x => x !== a) : [...p, a])}
                    className={`rounded-full border px-4 py-1.5 text-sm transition ${on ? "border-destructive bg-destructive/10 text-destructive" : "hover:border-primary"}`}>{a}</button>
                );
              })}
            </div>
          </div>
        </Section>

        <Section icon={Bell} title="Notifications">
          {[
            { k: "meal" as const, label: "Meal reminders", desc: "Get nudged at meal times" },
            { k: "water" as const, label: "Hydration reminders", desc: "Hourly water nudges" },
            { k: "weekly" as const, label: "Weekly summary", desc: "Sunday recap of progress" },
            { k: "promo" as const, label: "Tips & offers", desc: "Occasional emails from us" },
          ].map(n => (
            <div key={n.k} className="flex items-center justify-between border-b py-3 last:border-0">
              <div>
                <div className="text-sm font-medium">{n.label}</div>
                <div className="text-xs text-muted-foreground">{n.desc}</div>
              </div>
              <Switch checked={prefs[n.k]} onCheckedChange={(v) => setPrefs({ ...prefs, [n.k]: v })} />
            </div>
          ))}

          <div className="mt-6 rounded-xl border p-4">
            <div className="mb-2 text-sm font-semibold">Notification Rules</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Type</Label>
                <select
                  className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value="meal_reminder">Meal reminder</option>
                  <option value="hydration">Hydration</option>
                  <option value="weekly_summary">Weekly summary</option>
                  <option value="promo">Promotional</option>
                </select>
              </div>
              <div>
                <Label>Schedule</Label>
                <Input value={newSchedule} onChange={(e) => setNewSchedule(e.target.value)} className="mt-1.5" placeholder="daily:08:00" />
              </div>
              <div className="flex items-end">
                <Button onClick={createNotification} className="w-full">Add rule</Button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {loadingNotifications ? <div className="text-xs text-muted-foreground">Loading rules...</div> : null}
              {!loadingNotifications && !notifications.length ? (
                <div className="text-xs text-muted-foreground">No notification rules yet.</div>
              ) : null}
              {notifications.map((n) => (
                <div key={n._id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">{String(n.type).replace(/_/g, " ")}</div>
                    <div className="text-xs text-muted-foreground">{n.schedule || "default"}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => removeNotification(n._id)}>Delete</Button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-xl border p-4">
            <div className="mb-2 text-sm font-semibold">Email</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label>Test email recipient</Label>
                <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="mt-1.5" placeholder="you@example.com" />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={sendTestNotificationEmail} className="flex-1">Send test email</Button>
                <Button variant="outline" onClick={runSchedulerTick}>Run tick</Button>
              </div>
            </div>
          </div>
        </Section>

        <Section icon={Shield} title="Privacy & data">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Your data is encrypted and never sold. Download or delete anytime.</p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={exportData}>Export data</Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={deleteAccount}>
                Delete account
              </Button>
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}

function Section({ icon: Icon, title, children }: any) {
  return (
    <Card className="p-6">
      <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold"><Icon className="h-5 w-5 text-primary" /> {title}</h3>
      {children}
    </Card>
  );
}
