import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, GoogleButton } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Heavic Ventures Inventory" },
      { name: "description", content: "Create an account for the Heavic Ventures inventory system." },
      { property: "og:title", content: "Sign up — Heavic Ventures Inventory" },
      { property: "og:description", content: "Create an account for the Heavic Ventures inventory system." },
    ],
  }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/", replace: true });
  }, [session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle={`We sent a confirmation link to ${email}.`}>
        <Link to="/login" className="font-bold text-primary">Back to log in</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create account" subtitle="Start tracking your salon stock.">
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
          {busy ? "Creating..." : "Sign up"}
        </Button>
      </form>
      <div className="my-5 text-center text-sm text-muted-foreground">or</div>
      <GoogleButton />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-primary">Log in</Link>
      </p>
    </AuthShell>
  );
}
