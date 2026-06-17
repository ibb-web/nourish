import { Link } from "@tanstack/react-router";
import { ChefHat } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-muted p-12 md:flex gradient-hero">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary text-primary-foreground">
            <ChefHat className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold">Nourish</span>
        </Link>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight">Small choices.<br/>Big transformations.</h2>
          <p className="mt-4 max-w-md text-muted-foreground">Personalized nutrition that fits your real life — not the other way around.</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex -space-x-2">
            {["👩","🧑","👨"].map((e,i) => <div key={i} className="grid h-8 w-8 place-items-center rounded-full border-2 border-background bg-secondary">{e}</div>)}
          </div>
          <span>Joined by 200k+ people this year</span>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2 md:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary text-primary-foreground"><ChefHat className="h-5 w-5" /></div>
            <span className="font-display text-lg font-bold">Nourish</span>
          </Link>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
