import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Package, Receipt, Users, LogOut, ShieldCheck } from "lucide-react";
import { BrandMark } from "./AuthShell";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";

const sections = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/stock", label: "Stock", icon: Package },
  { to: "/sales", label: "Sales", icon: Receipt },
  { to: "/team", label: "Team", icon: Users },
] as const;

export function SalonShell() {
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { userName } = useUserRole();

  const title = sections.find((s) => s.to === pathname)?.label ?? "Dashboard";

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="relative flex flex-col justify-between bg-brand text-primary-foreground lg:sticky lg:top-0 lg:h-screen">
        <div>
          <div className="flex items-center justify-between p-6">
            <BrandMark size="sm" />
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              aria-label="Log out"
              title="Log out"
              className="text-primary-foreground hover:bg-primary-foreground/20 lg:hidden"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Links */}
          <nav
            aria-label="Main navigation"
            className="grid grid-cols-4 gap-1 px-3 pb-4 lg:mt-8 lg:grid-cols-1 lg:gap-2 lg:px-4"
          >
            {sections.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || (to === "/dashboard" && pathname === "/");
              return (
                <Button
                  key={to}
                  asChild
                  variant="ghost"
                  className={`h-12 px-3 text-sm font-semibold transition-all lg:justify-start lg:px-4 ${
                    active
                      ? "bg-accent font-bold text-accent-foreground shadow-sm"
                      : "text-primary-foreground/90 hover:bg-primary-foreground/15 hover:text-primary-foreground"
                  }`}
                >
                  <Link to={to} className="flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Admin Profile & Logout */}
        <div className="hidden border-t border-primary-foreground/15 p-4 lg:block">
          <div className="mb-3 rounded-xl bg-primary-foreground/10 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider">
                System Role
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-extrabold text-accent-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Administrator
              </span>
            </div>
            <p className="mt-1.5 truncate text-xs font-bold text-primary-foreground">{userName}</p>
            <p className="text-[10px] text-primary-foreground/70">Master Privileges & Team Admin</p>
          </div>

          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/15"
          >
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0">
        <header className="border-b bg-card px-6 py-5 sm:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-0.5 text-xs font-bold tracking-wide uppercase text-primary">
                Heavic Ventures / Salon Management Studio
              </p>
              <h1 className="font-heading text-3xl uppercase tracking-tight text-secondary sm:text-4xl">
                {title}
              </h1>
            </div>

            {/* Header Role Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary shadow-xs">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>
                  Privileges: <strong>Administrator (Master Control)</strong>
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-6 sm:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
