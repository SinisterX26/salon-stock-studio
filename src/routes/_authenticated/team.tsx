import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Phone,
  Mail,
  Pencil,
  Trash2,
  Lock,
  Search,
  CheckCircle2,
  Sparkles,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { teamOptions, salesOptions } from "@/lib/salon.queries";
import { TEAM_POSITIONS } from "@/lib/salon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useUserRole, type UserRole } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team & Staff Privileges — Heavic Ventures" },
      {
        name: "description",
        content: "Manage salon stylists, braiders, staff roles and administrative privileges.",
      },
      { property: "og:title", content: "Team & Staff Privileges — Heavic Ventures" },
      {
        property: "og:description",
        content: "Manage salon stylists, braiders, staff roles and administrative privileges.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(teamOptions),
      context.queryClient.ensureQueryData(salesOptions),
    ]);
  },
  component: TeamPage,
});

type TeamMember = {
  id: string;
  user_id: string;
  name: string;
  position: string;
  phone: string;
  email: string;
  role?: "admin" | "staff";
  active?: boolean;
  commission_rate?: number;
  created_at: string;
};

function TeamPage() {
  const qc = useQueryClient();
  const { data: team } = useSuspenseQuery(teamOptions);
  const { data: sales } = useSuspenseQuery(salesOptions);
  const { isAdmin, role: activeSessionRole, setRole: setActiveSessionRole } = useUserRole();

  const [search, setSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [editingMember, setEditingMember] = useState<Partial<TeamMember> | null>(null);

  // Filter team members
  const filteredTeam = useMemo(() => {
    return (team as TeamMember[]).filter((member) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        member.name.toLowerCase().includes(q) ||
        member.position.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.phone.toLowerCase().includes(q);

      const memberRole = member.role ?? "staff";
      const matchesRole =
        roleFilter === "All" ||
        (roleFilter === "admin" && memberRole === "admin") ||
        (roleFilter === "staff" && memberRole === "staff");

      return matchesSearch && matchesRole;
    });
  }, [team, search, roleFilter]);

  // Attribute sales count to team members
  const staffSalesCount = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach((s) => {
      const name = s.staff_name || "";
      if (name) {
        map[name] = (map[name] || 0) + 1;
      }
    });
    return map;
  }, [sales]);

  // Admin count vs staff count
  const adminCount = useMemo(
    () => (team as TeamMember[]).filter((m) => m.role === "admin").length,
    [team],
  );

  const refreshTeam = () => qc.invalidateQueries({ queryKey: ["team"] });

  // Toggle member role directly (Admin only)
  const handleToggleMemberRole = async (member: TeamMember) => {
    if (!isAdmin) {
      toast.error("Administrator privileges required to reassign user roles.");
      return;
    }
    const newRole: UserRole = member.role === "admin" ? "staff" : "admin";
    const { error } = await supabase
      .from("team_members")
      .update({ role: newRole })
      .eq("id", member.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${member.name} updated to ${newRole.toUpperCase()}`);
      refreshTeam();
    }
  };

  // Delete team member (Admin only)
  const handleDeleteMember = async (member: TeamMember) => {
    if (!isAdmin) {
      toast.error("Administrator privileges required to remove team staff.");
      return;
    }
    if (!confirm(`Remove ${member.name} from Heavic Ventures team directory?`)) return;

    const { error } = await supabase.from("team_members").delete().eq("id", member.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${member.name} removed from team`);
      refreshTeam();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-3xl uppercase tracking-tight text-secondary">
            Team Directory & Roles
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage stylists, braiders, inventory assistants, and administrative privilege levels.
          </p>
        </div>

        {isAdmin ? (
          <Button
            onClick={() =>
              setEditingMember({
                position: TEAM_POSITIONS[0],
                role: "staff",
                active: true,
                commission_rate: 10,
              })
            }
            className="h-12 rounded-full bg-brand px-6 font-bold text-primary-foreground shadow-brand hover:opacity-95"
          >
            <UserPlus className="mr-2 h-4 w-4" /> Add Team Member
          </Button>
        ) : (
          <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            <Lock className="h-4 w-4" /> Adding staff requires Admin privileges
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Team Size
            </span>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-heading text-3xl font-extrabold text-secondary">
            {team.length} Members
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Stylists, braiders & operations</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Administrators
            </span>
            <div className="rounded-full bg-accent/30 p-2 text-secondary">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-heading text-3xl font-extrabold text-secondary">
            {adminCount} Admin(s)
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Full master control privileges</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Staff / Stylists
            </span>
            <div className="rounded-full bg-muted p-2 text-secondary">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-heading text-3xl font-extrabold text-secondary">
            {team.length - adminCount} Staff
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Sales & inventory access</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Active Session Role
            </span>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-heading text-2xl font-extrabold uppercase text-secondary">
            {isAdmin ? "Administrator" : "Staff Member"}
          </div>
          <Button
            variant="link"
            size="sm"
            onClick={() => setActiveSessionRole(isAdmin ? "staff" : "admin")}
            className="mt-1 h-auto p-0 text-xs font-bold text-primary"
          >
            Switch to {isAdmin ? "Staff" : "Admin"} mode →
          </Button>
        </div>
      </div>

      {/* Permissions Matrix Explainer Card */}
      <div className="rounded-2xl border bg-gradient-to-r from-card via-card to-muted/30 p-6 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-heading text-xl uppercase tracking-tight text-secondary">
                Salon Role Privileges Comparison
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Understand how Administrator and User / Staff permissions control access throughout
              Heavic Ventures.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveSessionRole(isAdmin ? "staff" : "admin")}
              className="rounded-full text-xs font-bold"
            >
              <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
              Test {isAdmin ? "Staff Permissions" : "Admin Permissions"}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {/* Admin Rights */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-primary text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>Administrator Privileges</span>
            </div>
            <ul className="space-y-1.5 text-xs text-foreground/80">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Add, update, and permanently delete products in catalog</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Freely restock items or adjust baseline prices & alert thresholds</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Void existing sales records and restore corresponding inventory</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Invite, edit, remove staff, and assign Administrator vs Staff roles</span>
              </li>
            </ul>
          </div>

          {/* Staff Rights */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-secondary text-sm">
              <UserCheck className="h-4 w-4" />
              <span>Staff / User Privileges</span>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0" />
                <span>View real-time stock levels, check product prices and search items</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0" />
                <span>Record client sales with automatic inventory deduction</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0" />
                <span>Generate and print salon receipts for client transactions</span>
              </li>
              <li className="flex items-center gap-1.5 text-muted-foreground/70">
                <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>Master catalog deletions and team re-assignments are restricted</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by stylist name, specialty, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 rounded-full bg-card pl-11"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-12 rounded-full bg-card sm:w-52">
            <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Privileges</SelectItem>
            <SelectItem value="admin">Administrators Only</SelectItem>
            <SelectItem value="staff">Staff Members Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Team Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTeam.map((member) => {
          const isMemberAdmin = member.role === "admin";
          const salesRecorded = staffSalesCount[member.name] || 0;

          return (
            <div
              key={member.id}
              className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-xs transition-hover hover:border-primary/40"
            >
              <div>
                {/* Header: Name, Role Badge, Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-base font-bold text-primary-foreground shadow-sm">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground leading-snug">{member.name}</h4>
                      <p className="text-xs font-medium text-primary">{member.position}</p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isMemberAdmin
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary/10 text-secondary"
                    }`}
                  >
                    {isMemberAdmin ? (
                      <ShieldCheck className="h-3 w-3" />
                    ) : (
                      <UserCheck className="h-3 w-3" />
                    )}
                    {isMemberAdmin ? "Admin" : "Staff"}
                  </span>
                </div>

                {/* Contact Information */}
                <div className="mt-4 space-y-2 border-t pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <a
                      href={`tel:${member.phone}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {member.phone || "No phone listed"}
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <a
                      href={`mailto:${member.email}`}
                      className="truncate font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {member.email || "No email listed"}
                    </a>
                  </div>
                </div>

                {/* Performance stats */}
                <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Sales Attributed:</span>
                  <span className="font-bold text-secondary">{salesRecorded} transaction(s)</span>
                </div>
              </div>

              {/* Action Buttons for Admins */}
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                {isAdmin ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleMemberRole(member)}
                      className="h-8 rounded-full text-xs font-bold"
                      title="Switch member between Admin and Staff"
                    >
                      <ArrowRightLeft className="mr-1 h-3 w-3" />
                      Make {isMemberAdmin ? "Staff" : "Admin"}
                    </Button>

                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingMember(member)}
                        className="h-8 w-8 hover:bg-muted"
                        title="Edit staff details"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteMember(member)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        title="Delete staff member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">
                    Admin access needed to modify team
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Member Dialog */}
      {editingMember && (
        <TeamMemberDialog
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={refreshTeam}
        />
      )}
    </div>
  );
}

function TeamMemberDialog({
  member,
  onClose,
  onSaved,
}: {
  member: Partial<TeamMember>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<TeamMember>>(member);
  const [busy, setBusy] = useState(false);

  const saveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = (form.name ?? "").trim();
    if (!name) {
      toast.error("Please enter a staff member name");
      return;
    }

    const payload = {
      name,
      position: form.position ?? TEAM_POSITIONS[0],
      phone: (form.phone ?? "").trim(),
      email: (form.email ?? "").trim(),
      role: form.role ?? "staff",
      active: form.active ?? true,
      commission_rate: Math.max(0, Number(form.commission_rate) || 10),
    };

    setBusy(true);

    const { error } = form.id
      ? await supabase.from("team_members").update(payload).eq("id", form.id)
      : await supabase.from("team_members").insert(payload);

    setBusy(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(form.id ? "Team member updated" : "Team member added to directory");
      onSaved();
      onClose();
    }
  };

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl uppercase text-secondary">
            {form.id ? "Edit Team Member" : "Add Team Member"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure stylist profile, contact information, and role privileges.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={saveMember} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Full Name
            </Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Akua Mansa"
              className="h-11 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Position / Specialty
            </Label>
            <Select
              value={form.position ?? TEAM_POSITIONS[0]}
              onValueChange={(v) => setForm({ ...form, position: v })}
            >
              <SelectTrigger className="h-11 rounded-xl bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_POSITIONS.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Assigned Privilege Level
            </Label>
            <Select
              value={form.role ?? "staff"}
              onValueChange={(v: "admin" | "staff") => setForm({ ...form, role: v })}
            >
              <SelectTrigger className="h-11 rounded-xl bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff (Standard: Sales & Stock Lookup)</SelectItem>
                <SelectItem value="admin">
                  Administrator (Full Control & Team Management)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Phone Number
              </Label>
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+233 24 123 4567"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email Address
              </Label>
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="staff@heavic.com"
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 flex-1 rounded-full font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="h-11 flex-1 rounded-full bg-brand font-bold text-primary-foreground shadow-brand"
            >
              {busy ? "Saving..." : form.id ? "Update Member" : "Save Team Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
