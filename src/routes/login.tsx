import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, GoogleButton } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Heavic Ventures Inventory" },
      { name: "description", content: "Log in to manage Heavic Ventures salon stock." },
      { property: "og:title", content: "Log in — Heavic Ventures Inventory" },
      { property: "og:description", content: "Log in to manage Heavic Ventures salon stock." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/", replace: true });
  }, [session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) toast.error(error.message);
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to check your stock.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" />
        </div>
        <Button type="submit" disabled={busy} className="h-12 w-full rounded-full bg-brand text-base font-bold shadow-brand">
          {busy ? "Logging in..." : "Log in"}
        </Button>
      </form>
      <div className="my-5 text-center text-sm text-muted-foreground">or</div>
      <GoogleButton />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/signup" className="font-bold text-primary">Create an account</Link>
      </p>
    </AuthShell>
  );
}
