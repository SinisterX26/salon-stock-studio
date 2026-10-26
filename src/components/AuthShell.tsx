import type { ReactNode } from "react";
import logo from "@/assets/heavic-logo.jpg.asset.json";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export function BrandMark({ size = "lg" }: { size?: "sm" | "lg" }) {
  const big = size === "lg";
  return (
    <div className="flex items-center gap-3">
      <img
        src={logo.url}
        alt="Heavic Ventures logo"
        className={`${big ? "h-20 w-20" : "h-11 w-11"} rounded-full border-2 border-accent object-cover`}
      />
      <div className="leading-none text-primary-foreground">
        <div className={`font-display ${big ? "text-4xl" : "text-2xl"}`}>Heavic</div>
        <div className={`font-display ${big ? "text-xl" : "text-sm"} text-accent`}>Ventures</div>
      </div>
    </div>
  );
}

export function GoogleButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
        if (r.error) toast.error("Google sign-in failed");
      }}
      className="w-full rounded-full border border-input bg-card py-3 font-semibold text-foreground transition hover:bg-muted"
    >
      Continue with Google
    </button>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand p-12 lg:flex">
        <BrandMark />
        <div>
          <p className="font-heading text-5xl uppercase tracking-wide text-primary-foreground">
            We deal in anything
            <br />
            <span className="text-accent">associated with hair</span>
          </p>
          <ul className="mt-8 space-y-2 font-heading text-xl uppercase tracking-wider text-accent">
            <li>• Hair extensions</li>
            <li>• Shampoo & conditioner</li>
            <li>• Hair growth oils</li>
            <li>• Cream & all hair accessories</li>
          </ul>
        </div>
        <p className="text-sm text-primary-foreground/70">Inventory system</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 rounded-3xl bg-brand p-5 lg:hidden">
            <BrandMark size="sm" />
          </div>
          <h1 className="font-heading text-4xl uppercase text-secondary">{title}</h1>
          <p className="mt-1 text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
