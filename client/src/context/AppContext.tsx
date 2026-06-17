import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getToken, setToken, apiGet, apiPatch } from "../lib/api";

type Theme = "light" | "dark";
type User = {
  _id?: string;
  name: string;
  email: string;
  avatar?: string;
  theme?: Theme;
  goal?: string;
  diet?: string;
  allergies?: string[];
  activity?: string;
  mealsPerDay?: number;
  subscriptionTier?: "Starter" | "Plus" | "Pro";
  notifications?: { meal: boolean; water: boolean; weekly: boolean; promo: boolean };
  favorites?: string[];
  bookmarks?: string[];
  water?: number;
} | null;

type AppContextType = {
  theme: Theme;
  toggleTheme: () => void;
  user: User;
  setUser: (u: User) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  water: number;
  setWater: (n: number) => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [user, setUser] = useState<User>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [water, setWater] = useState<number>(0);

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("theme")) as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  // Load auth token and current user on mount
  useEffect(() => {
    const tryLoad = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const payload = await apiGet<User>("/auth/me");
        setUser(payload);
        if (payload?.theme) setTheme(payload.theme);
        if (Array.isArray(payload?.favorites)) setFavorites(payload.favorites);
        if (Array.isArray(payload?.bookmarks)) setBookmarks(payload.bookmarks);
        if (typeof payload?.water === "number") setWater(payload.water);
      } catch (err) {
        // invalid token or fetch error — clear token
        setToken(null);
        setUser(null);
      }
    };
    tryLoad();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  const toggleFavorite = (id: string) => {
    setFavorites((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      if (user?._id) apiPatch(`/users/${user._id}`, { favorites: next }).catch(() => {});
      return next;
    });
  };
  const toggleBookmark = (id: string) => {
    setBookmarks((b) => {
      const next = b.includes(id) ? b.filter((x) => x !== id) : [...b, id];
      if (user?._id) apiPatch(`/users/${user._id}`, { bookmarks: next }).catch(() => {});
      return next;
    });
  };

  useEffect(() => {
    if (!user?._id) return;
    apiPatch(`/users/${user._id}`, { theme }).catch(() => {});
  }, [theme, user?._id]);

  useEffect(() => {
    if (!user?._id) return;
    apiPatch(`/users/${user._id}`, { water }).catch(() => {});
  }, [water, user?._id]);

  return (
    <AppContext.Provider value={{ theme, toggleTheme, user, setUser, favorites, toggleFavorite, bookmarks, toggleBookmark, water, setWater }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
