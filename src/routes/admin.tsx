import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { fetchLeaderboard, type LeaderboardEntry } from "@/services/api";
import {
  Loader2,
  LogOut,
  Shield,
  Users,
  School,
  AlertTriangle,
  Trophy,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console — Skor" },
      { name: "description", content: "Administrator dashboard for managing users, classrooms, and system logs." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminConsole,
});

type Tab = "users" | "classrooms" | "errors" | "leaderboard";

interface UserRow {
  id: string;
  full_name: string;
  role: AppRole;
  school: string | null;
  grade: string | null;
  created_at: string;
}

interface ClassroomRow {
  id: string;
  name: string;
  subject: string | null;
  invite_code: string;
  teacher_id: string;
  created_at: string;
  teacher_name?: string;
  member_count?: number;
}

interface ErrorRow {
  id: string;
  user_id: string | null;
  level: string;
  message: string;
  source: string | null;
  url: string | null;
  stack: string | null;
  created_at: string;
}

function AdminConsole() {
  const { profile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("users");

  const unauthorized = !authLoading && profile?.role !== "admin";

  useEffect(() => {
    if (unauthorized) void navigate({ to: "/" });
  }, [unauthorized, navigate]);

  if (authLoading || unauthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: "users", label: "Users", icon: Users },
    { key: "classrooms", label: "Classrooms", icon: School },
    { key: "errors", label: "Error Log", icon: AlertTriangle },
    { key: "leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-destructive/15 text-destructive">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight">Admin Console</h1>
              <p className="text-xs text-muted-foreground">
                Signed in as {profile?.full_name || "Administrator"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://lovable.dev"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Backend
            </a>
            <Link
              to="/"
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
            >
              Home
            </Link>
            <button
              onClick={() => void signOut()}
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <nav className="inline-flex flex-wrap rounded-full border border-border bg-card/60 p-1 text-sm">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition",
                tab === key
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {tab === "users" && <UsersPanel />}
        {tab === "classrooms" && <ClassroomsPanel />}
        {tab === "errors" && <ErrorsPanel />}
        {tab === "leaderboard" && <LeaderboardPanel />}
      </main>
    </div>
  );
}

/* ---------------- Users ---------------- */

function UsersPanel() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, school, grade, created_at")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data ?? []) as UserRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.school ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const changeRole = async (id: string, role: AppRole) => {
    setSavingId(id);
    const { error } = await supabase.rpc("admin_set_user_role", {
      _target_user: id,
      _new_role: role,
    });
    setSavingId(null);
    if (error) {
      alert(`Failed: ${error.message}`);
      return;
    }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, role } : r)));
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">All users ({rows.length})</h2>
          <p className="text-sm text-muted-foreground">Change a user's role or review profiles.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, school, ID…"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          <button
            onClick={() => void load()}
            className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
        </div>
      )}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">School</th>
                <th className="py-2 pr-3">Grade</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Joined</th>
                <th className="py-2 pr-3">ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border/40">
                  <td className="py-2 pr-3 font-medium">{u.full_name || "—"}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{u.school || "—"}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{u.grade || "—"}</td>
                  <td className="py-2 pr-3">
                    <select
                      value={u.role}
                      disabled={savingId === u.id}
                      onChange={(e) => void changeRole(u.id, e.target.value as AppRole)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    >
                      <option value="student">student</option>
                      <option value="teacher">teacher</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-muted-foreground">
                    {u.id.slice(0, 8)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No users match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------------- Classrooms ---------------- */

function ClassroomsPanel() {
  const [rows, setRows] = useState<ClassroomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("classrooms")
      .select("id, name, subject, invite_code, teacher_id, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const classrooms = (data ?? []) as ClassroomRow[];

    // Hydrate teacher names + member counts
    const teacherIds = Array.from(new Set(classrooms.map((c) => c.teacher_id)));
    const [{ data: profiles }, { data: members }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", teacherIds.length ? teacherIds : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("classroom_members").select("classroom_id"),
    ]);
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name as string]));
    const countMap = new Map<string, number>();
    for (const m of (members ?? []) as { classroom_id: string }[]) {
      countMap.set(m.classroom_id, (countMap.get(m.classroom_id) ?? 0) + 1);
    }
    setRows(
      classrooms.map((c) => ({
        ...c,
        teacher_name: nameMap.get(c.teacher_id),
        member_count: countMap.get(c.id) ?? 0,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this classroom permanently?")) return;
    const { error } = await supabase.from("classrooms").delete().eq("id", id);
    if (error) {
      alert(`Failed: ${error.message}`);
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Classrooms ({rows.length})</h2>
          <p className="text-sm text-muted-foreground">All classrooms across all teachers.</p>
        </div>
        <button
          onClick={() => void load()}
          className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition"
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading classrooms…
        </div>
      )}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2 pr-3">Teacher</th>
                <th className="py-2 pr-3">Members</th>
                <th className="py-2 pr-3">Invite code</th>
                <th className="py-2 pr-3">Created</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border/40">
                  <td className="py-2 pr-3 font-medium">{c.name}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{c.subject || "—"}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{c.teacher_name || c.teacher_id.slice(0, 8)}</td>
                  <td className="py-2 pr-3 tabular-nums">{c.member_count ?? 0}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{c.invite_code}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <button
                      onClick={() => void remove(c.id)}
                      className="rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    No classrooms yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------------- Errors ---------------- */

function ErrorsPanel() {
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("app_errors")
      .select("id, user_id, level, message, source, url, stack, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) setError(error.message);
    else setRows((data ?? []) as ErrorRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Error log ({rows.length})</h2>
          <p className="text-sm text-muted-foreground">Most recent 200 client-side errors.</p>
        </div>
        <button
          onClick={() => void load()}
          className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition"
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading errors…
        </div>
      )}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <ul className="mt-4 divide-y divide-border/60">
          {rows.map((r) => (
            <li key={r.id} className="py-3">
              <button
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          r.level === "error"
                            ? "bg-destructive/15 text-destructive"
                            : r.level === "warn"
                              ? "bg-warning/15 text-warning"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {r.level}
                      </span>
                      <span className="truncate text-sm font-medium">{r.message}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {r.source || "—"} · {r.url || "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
              </button>
              {expanded === r.id && r.stack && (
                <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted/40 p-3 text-[11px] leading-snug">
                  {r.stack}
                </pre>
              )}
            </li>
          ))}
          {rows.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No errors logged.</li>
          )}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Leaderboard ---------------- */

function LeaderboardPanel() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchLeaderboard(undefined, 50);
      setRows(r.leaderboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Leaderboard ({rows.length})</h2>
          <p className="text-sm text-muted-foreground">Top scoring students across the platform.</p>
        </div>
        <button
          onClick={() => void load()}
          className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition"
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <ul className="mt-4 divide-y divide-border/60">
          {rows.map((s, i) => (
            <li key={s.student_id || i} className="flex items-center gap-3 py-2">
              <span className="w-6 text-center font-display text-sm font-bold text-muted-foreground">
                {s.rank}
              </span>
              <span className="flex-1 truncate font-mono text-xs">
                {(s.student_id || "").slice(0, 8)}
              </span>
              {s.game_wins > 0 && (
                <span className="text-xs text-muted-foreground">{s.game_wins} wins</span>
              )}
              <span className="font-display text-sm font-bold tabular-nums">{s.total_score}</span>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No data yet.</li>
          )}
        </ul>
      )}
    </section>
  );
}
