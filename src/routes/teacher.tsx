import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Target,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Loader2,
  LogOut,
  LayoutDashboard,
  School,
  Trophy,
  Gamepad2,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  fetchTeacherInsights,
  fetchLeaderboard,
  type ClassMasteryItem,
  type RecentAlert,
  type LeaderboardEntry,
} from "@/services/api";
import { ClassroomsPanel } from "@/components/teacher/ClassroomsPanel";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher Dashboard — Skor" },
      { name: "description", content: "Track class mastery, diagnostic insights, and common misconceptions across the KSSM syllabus." },
      { property: "og:title", content: "Skor Teacher Dashboard" },
      { property: "og:description", content: "Real-time analytics on student mastery." },
    ],
  }),
  component: TeacherDashboard,
});

function TeacherDashboard() {
  const { t } = useI18n();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"insights" | "classrooms">("insights");
  const [classMastery, setClassMastery] = useState<ClassMasteryItem[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [activeStudents, setActiveStudents] = useState<string>("-");
  const [classAverageMastery, setClassAverageMastery] = useState<string>("-");
  const [weakestTopic, setWeakestTopic] = useState<string>("-");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topStudents, setTopStudents] = useState<LeaderboardEntry[]>([]);

  const unauthorized = !!profile && profile.role !== "teacher" && profile.role !== "admin";

  useEffect(() => {
    void fetchLeaderboard(undefined, 5).then((r) => setTopStudents(r.leaderboard)).catch(() => undefined);
  }, []);

  // Server-side enforced via RLS; this is a UX guard for non-teachers.
  useEffect(() => {
    if (unauthorized) {
      void navigate({ to: "/" });
    }
  }, [unauthorized, navigate]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = (initial: boolean) => {
      if (initial) setLoading(true);
      fetchTeacherInsights()
        .then((data) => {
          if (cancelled) return;
          setError(null);
          setClassMastery(Array.isArray(data?.class_mastery) ? data.class_mastery : []);
          setRecentAlerts(Array.isArray(data?.recent_alerts) ? data.recent_alerts : []);
          setActiveStudents(
            typeof data?.active_students === "number" ? String(data.active_students) : "-",
          );
          setClassAverageMastery(
            typeof data?.class_average_mastery === "number"
              ? `${data.class_average_mastery}%`
              : "-",
          );
          setWeakestTopic(
            typeof data?.weakest_topic === "string" && data.weakest_topic.trim().length > 0
              ? data.weakest_topic
              : "-",
          );
        })
        .catch((err) => {
          if (cancelled || !initial) return;
          console.error("[Skor] fetchTeacherInsights failed", err);
          const status = (err && (err.status ?? err.statusCode)) as number | undefined;
          const msg = String(err?.message ?? "");
          if (status === 403 || /permission|rls|forbidden/i.test(msg)) {
            setError("You don't have permission to view this information.");
          } else {
            setError("Couldn't load live insights.");
          }
        })
        .finally(() => {
          if (!cancelled && initial) setLoading(false);
        });
    };

    load(true);
    // Auto-refresh every 10s so newly answered questions appear live.
    timer = setInterval(() => load(false), 10000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const masteryData = (classMastery ?? []).map((m) => ({
    subject: m?.subject ?? "",
    mastery: m?.mastery ?? 0,
    fullMark: 100,
  }));


  const severityToColor = (sev?: string) => {
    if (sev === "destructive" || sev === "high") return "destructive";
    if (sev === "success" || sev === "low") return "success";
    return "warning";
  };
  const severityToEmoji = (sev?: string) => {
    const c = severityToColor(sev);
    return c === "destructive" ? "🔴" : c === "success" ? "🟢" : "🟡";
  };

  const insights = (recentAlerts ?? []).map((a) => ({
    color: severityToColor(a?.severity),
    emoji: severityToEmoji(a?.severity),
    topic: a?.topic ?? "",
    category: a?.category ?? "",
    observation: a?.observation ?? a?.diagnostic_tag ?? "",
    action: a?.action ?? "",
  }));

  const handleGenerateIntervention = (topic: string) => {
    console.log("[Skor] Generate intervention for:", topic);
  };

  if (unauthorized) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight">{t.teacherDashboard}</h1>
              <p className="text-xs text-muted-foreground">{t.schoolMeta}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              to="/leaderboard"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-yellow-500 hover:text-yellow-400 transition"
              aria-label="Leaderboard"
            >
              <Trophy className="h-4 w-4" />
            </Link>
            <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">● {t.live}</span>
            {profile?.full_name && (
              <span className="hidden sm:block text-sm font-medium text-foreground">
                {profile.full_name}
              </span>
            )}
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
              {profile?.full_name
                ? profile.full_name.split(" ").slice(0, 2).map((w) => w[0].toUpperCase()).join("")
                : "?"}
            </div>
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
        <nav className="inline-flex rounded-full border border-border bg-card/60 p-1 text-sm">
          {([
            { key: "insights", label: "Insights", icon: LayoutDashboard },
            { key: "classrooms", label: "My Classrooms", icon: School },
          ] as const).map(({ key, label, icon: Icon }) => (
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

        {tab === "classrooms" ? (
          <ClassroomsPanel />
        ) : (
        <>
        {loading && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading live class insights…
          </div>
        )}
        {error && !loading && (
          <div className="rounded-xl border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-warning">
            {error}
          </div>
        )}
        <section className="grid gap-4 md:grid-cols-3">
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            label={t.activeStudents}
            value={activeStudents}
            delta={t.todayDelta}
            trend="up"
            accent="primary"
          />
          <KpiCard
            icon={<Target className="h-5 w-5" />}
            label={t.classAverageMastery}
            value={classAverageMastery}
            delta={t.weekDelta}
            trend="up"
            accent="success"
          />
          <KpiCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label={t.weakestTopic}
            value={weakestTopic}
            delta={t.masteryShort}
            trend="down"
            accent="destructive"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">{t.classMasteryTitle}</h2>
                <p className="text-sm text-muted-foreground">{t.classMasterySub}</p>
              </div>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">{t.last7Days}</span>
            </div>
            <div className="mt-4 h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={masteryData} outerRadius="78%">
                  <PolarGrid stroke="oklch(0.30 0.03 280)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "oklch(0.85 0.02 280)", fontSize: 12, fontWeight: 500 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: "oklch(0.55 0.02 280)", fontSize: 10 }}
                    stroke="oklch(0.30 0.03 280)"
                  />
                  <Radar
                    name={t.masteryLabel}
                    dataKey="mastery"
                    stroke="oklch(0.65 0.28 300)"
                    fill="oklch(0.65 0.28 300)"
                    fillOpacity={0.45}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.20 0.025 280)",
                      border: "1px solid oklch(0.30 0.03 280)",
                      borderRadius: 12,
                      color: "oklch(0.98 0.005 280)",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">{t.diagnosticInsights}</h2>
              <span className="text-xs text-muted-foreground">{insights.length} {t.alerts}</span>
            </div>
            
            <ul className="mt-4 space-y-3">
              {insights.map((i, idx) => (
                <li
                  key={idx}
                  className={`rounded-xl border p-4 transition hover:bg-accent/30 ${
                    i.color === "destructive"
                      ? "border-destructive/40 bg-destructive/5"
                      : i.color === "warning"
                        ? "border-warning/40 bg-warning/5"
                        : "border-success/40 bg-success/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg leading-none">{i.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {i.category && (
                          <Badge
                            variant={
                              i.color === "destructive"
                                ? "destructive"
                                : i.color === "success"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-[10px] uppercase tracking-wide"
                          >
                            {i.category}
                          </Badge>
                        )}
                        {i.topic && (
                          <span className="text-xs text-muted-foreground">{i.topic}</span>
                        )}
                      </div>
                      {i.observation && (
                        <p className="mt-2 text-sm font-medium leading-snug">{i.observation}</p>
                      )}
                      {(i.action || i.topic) && (
                        <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
                          <p className="flex-1 text-xs text-muted-foreground leading-snug">
                            {i.action || "Recommended next step"}
                          </p>
                          <button
                            onClick={() => handleGenerateIntervention(i.topic)}
                            className="shrink-0 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition"
                          >
                            Generate Intervention
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h2 className="font-display text-lg font-semibold">Top 5 Students</h2>
            </div>
            <Link
              to="/leaderboard"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View full leaderboard →
            </Link>
          </div>
          {topStudents.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No leaderboard data yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border/60">
              {topStudents.map((s, i) => {
                const tail = (s.student_id || "").replace(/-/g, "").slice(-4).toUpperCase();
                return (
                  <li key={s.student_id || i} className="flex items-center gap-3 py-2.5">
                    <span className="w-5 text-center font-display text-sm font-bold text-muted-foreground">
                      {s.rank}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">
                      Student #{tail || (i + 1)}
                    </span>
                    {s.game_wins > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-600">
                        <Gamepad2 className="h-3 w-3" /> {s.game_wins}
                      </span>
                    )}
                    <span className="font-display text-sm font-bold tabular-nums">
                      {s.total_score}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        </>
        )}
      </main>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  delta,
  trend,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  accent: "primary" | "success" | "destructive";
}) {
  const accentClasses =
    accent === "primary"
      ? "bg-primary/15 text-primary-glow"
      : accent === "success"
        ? "bg-success/15 text-success"
        : "bg-destructive/15 text-destructive";
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${accentClasses}`}>{icon}</span>
        <span
          className={`flex items-center gap-1 text-xs font-medium ${
            trend === "up" ? "text-success" : "text-destructive"
          }`}
        >
          {trend === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {delta}
        </span>
      </div>
      <div className="mt-4 text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
