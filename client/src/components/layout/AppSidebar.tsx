import { Link, useRouterState } from "@tanstack/react-router";
import { ChefHat, LayoutDashboard, CalendarDays, Apple, BookOpen, ShoppingBasket, TrendingUp, Settings, LogOut, Moon, Sun } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Meal Planner", url: "/meal-planner", icon: CalendarDays },
  { title: "Food Database", url: "/food-database", icon: Apple },
  { title: "Recipes", url: "/recipes", icon: BookOpen },
  { title: "Grocery List", url: "/grocery", icon: ShoppingBasket },
  { title: "Progress", url: "/progress", icon: TrendingUp },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { theme, toggleTheme, user } = useApp();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b p-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-primary text-primary-foreground">
            <ChefHat className="h-5 w-5" />
          </div>
          {!collapsed && <span className="font-display text-lg font-bold">Nourish</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Menu</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={path === item.url || path.startsWith(item.url + "/")} className="h-10">
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Account</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path === "/profile"} className="h-10">
                  <Link to="/profile"><Settings className="h-4 w-4" />{!collapsed && <span>Settings</span>}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-3">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2">
            <Link to="/profile" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-2 hover:bg-sidebar-accent">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm">👤</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{user?.name}</div>
                <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
              </div>
            </Link>
            <Button size="icon" variant="ghost" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" asChild aria-label="Sign out">
              <Link to="/"><LogOut className="h-4 w-4" /></Link>
            </Button>
          </div>
        ) : (
          <Button size="icon" variant="ghost" onClick={toggleTheme} className="mx-auto">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
