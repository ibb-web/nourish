import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";

export const Route = createFileRoute("/_dashboard")({ component: AppLayout });

function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:hidden">
            <SidebarTrigger />
            <span className="font-display font-semibold">Nourish</span>
          </header>
          <main className="flex-1"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}
