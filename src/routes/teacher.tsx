import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Target, AlertTriangle, ArrowLeft, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
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
  type ClassMasteryItem,
  type RecentAlert,
} from "@/services/api";

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

  const fallbackMastery: ClassMasteryItem[] = [
    { subject: t.subjKinematics, mastery: 72 },
    { subject: t.subjAlgebra, mastery: 84 },
    { subject: t.subjEM, mastery: 48 },
    { subject: t.subjBio, mastery: 76 },
    { subject: t.subjSejarah, mastery: 65 },
  ];

  const fallbackAlerts: RecentAlert[] = [
    { diagnostic_tag: t.insight1, topic: t.insight1Topic, severity: "destructive" },
    { diagnostic_tag: t.insight2, topic: t.insight2Topic, severity: "warning" },
    { diagnostic_tag: t.insight3, topic: t.insight3Topic, severity: "warning" },
    { diagnostic_tag: t.insight4, topic: t.insight4Topic, severity: "success" },
  ];

  const [classMastery, setClassMastery] = useState<ClassMasteryItem[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTeacherInsights()
      .then((data) => {
        if (cancelled) return;
        setClassMastery(data.class_mastery?.length ? data.class_mastery : fallbackMastery);
        setRecentAlerts(data.recent_alerts?.length ? data.recent_alerts : fallbackAlerts);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[Skor] fetchTeacherInsights failed", err);
        setError("Couldn't load live insights. Showing the latest cached snapshot.");
        setClassMastery(fallbackMastery);
        setRecentAlerts(fallbackAlerts);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const masteryData = (classMastery.length ? classMastery : fallbackMastery).map((m) => ({
    subject: m.subject,
    mastery: m.mastery,
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

  const insights = (recentAlerts.length ? recentAlerts : fallbackAlerts).map((a) => ({
    color: severityToColor(a.severity),
    emoji: severityToEmoji(a.severity),
    text: a.diagnostic_tag,
    topic: a.topic ?? "",
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight">{t.teacherDashboard}</h1>
              <p className="text-xs text-muted-foreground">{t.schoolMeta}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">● {t.live}</span>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">CA</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
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
            value="248"
            delta={t.todayDelta}
            trend="up"
            accent="primary"
          />
          <KpiCard
            icon={<Target className="h-5 w-5" />}
            label={t.classAverageMastery}
            value="69%"
            delta={t.weekDelta}
            trend="up"
            accent="success"
          />
          <KpiCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label={t.weakestTopic}
            value={t.subjEM}
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
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-snug">{i.text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{i.topic}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
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
