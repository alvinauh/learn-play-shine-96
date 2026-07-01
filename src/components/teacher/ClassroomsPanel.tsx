import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Copy, Check, Users, ArrowLeft, X, AlertTriangle, Sparkles } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { generateAiTask, assignAiTask, type GenerateTaskResult } from "@/services/api";

interface Classroom {
  id: string;
  name: string;
  subject: string | null;
  invite_code: string;
  created_at: string;
}

interface StudentRow {
  id: string;
  full_name: string;
  school: string | null;
  grade: string | null;
  joined_at: string;
  classroom_id: string;
  classroom_name: string;
}

export function ClassroomsPanel() {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState<Classroom | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [aiTaskStudent, setAiTaskStudent] = useState<{ student: StudentRow; subject: string | null } | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: cls, error: e1 } = await supabase
        .from("classrooms")
        .select("id, name, subject, invite_code, created_at")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });
      if (e1) throw e1;
      const classroomsList = (cls ?? []) as Classroom[];
      setClassrooms(classroomsList);

      if (classroomsList.length === 0) {
        setStudents([]);
        return;
      }

      const ids = classroomsList.map((c) => c.id);
      const { data: members, error: e2 } = await supabase
        .from("classroom_members")
        .select("student_id, classroom_id, joined_at")
        .in("classroom_id", ids);
      if (e2) throw e2;

      const studentIds = Array.from(new Set((members ?? []).map((m) => m.student_id)));
      let profilesById: Record<
        string,
        { full_name: string; school: string | null; grade: string | null }
      > = {};
      if (studentIds.length > 0) {
        const { data: profs, error: e3 } = await supabase
          .from("profiles")
          .select("id, full_name, school, grade")
          .in("id", studentIds);
        if (e3) throw e3;
        profilesById = Object.fromEntries(
          (profs ?? []).map((p) => [
            p.id,
            { full_name: p.full_name, school: p.school, grade: p.grade },
          ]),
        );
      }
      const cMap = Object.fromEntries(classroomsList.map((c) => [c.id, c.name]));
      const rows: StudentRow[] = (members ?? []).map((m) => ({
        id: m.student_id,
        classroom_id: m.classroom_id,
        classroom_name: cMap[m.classroom_id] ?? "",
        joined_at: m.joined_at,
        full_name: profilesById[m.student_id]?.full_name ?? "Student",
        school: profilesById[m.student_id]?.school ?? null,
        grade: profilesById[m.student_id]?.grade ?? null,
      }));
      setStudents(rows);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load classrooms";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (selectedStudent) {
    return (
      <StudentDetail
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">My Classrooms</h2>
          <p className="text-sm text-muted-foreground">
            {classrooms.length} classroom{classrooms.length === 1 ? "" : "s"} •{" "}
            {students.length} student{students.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="rounded-xl bg-gradient-primary shadow-glow hover:opacity-95"
        >
          <Plus className="h-4 w-4" /> New classroom
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading classrooms…
        </div>
      ) : classrooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-display text-lg font-semibold">
            No classrooms yet
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first classroom and share the invite link with students.
          </p>
          <Button
            onClick={() => setShowCreate(true)}
            className="mt-5 rounded-xl bg-gradient-primary shadow-glow hover:opacity-95"
          >
            <Plus className="h-4 w-4" /> New classroom
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {classrooms.map((cls) => {
            const roster = students.filter((s) => s.classroom_id === cls.id);
            return (
              <div
                key={cls.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/60 px-5 py-4">
                  <div>
                    <h3 className="font-display text-base font-semibold">{cls.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {cls.subject ?? "—"} • {roster.length} student
                      {roster.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInvite(cls)}
                    className="rounded-lg"
                  >
                    <Plus className="h-4 w-4" /> Add student
                  </Button>
                </div>
                {roster.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No students yet — share the invite link to get them in.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-5 py-2 text-left font-medium">Name</th>
                        <th className="px-5 py-2 text-left font-medium">School</th>
                        <th className="px-5 py-2 text-left font-medium">Grade</th>
                        <th className="px-5 py-2 text-left font-medium">Joined</th>
                        <th className="px-5 py-2"></th>
                        <th className="px-5 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((s) => (
                        <tr
                          key={`${s.classroom_id}:${s.id}`}
                          className="cursor-pointer border-t border-border/60 transition hover:bg-accent/30"
                          onClick={() => setSelectedStudent(s)}
                        >
                          <td className="px-5 py-3 font-medium">{s.full_name}</td>
                          <td className="px-5 py-3 text-muted-foreground">
                            {s.school ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">
                            {s.grade ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">
                            {new Date(s.joined_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAiTaskStudent({ student: s, subject: cls.subject });
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-violet-400/50 bg-violet-900/30 px-2.5 py-1.5 text-[11px] font-semibold text-violet-200 transition hover:bg-violet-800/50"
                            >
                              <Sparkles className="h-3 w-3" /> AI Task
                            </button>
                          </td>
                          <td className="px-5 py-3 text-right text-xs font-medium text-primary-glow">
                            View insights →
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateClassroomDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={() => {
          setShowCreate(false);
          void load();
        }}
      />
      <InviteDialog
        classroom={showInvite}
        onOpenChange={(open) => !open && setShowInvite(null)}
      />
      <AiTaskDialog
        student={aiTaskStudent?.student ?? null}
        classroomSubject={aiTaskStudent?.subject ?? null}
        onClose={() => setAiTaskStudent(null)}
      />
    </div>
  );
}

function CreateClassroomDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.from("classrooms").insert({
      teacher_id: user.id,
      name: name.trim(),
      subject: subject.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    setSubject("");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New classroom</DialogTitle>
          <DialogDescription>
            Give it a name (e.g. "Form 4 Bestari — Physics") and optionally a subject.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cls-name">Name</Label>
            <Input
              id="cls-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Form 4 Bestari"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cls-subject">Subject</Label>
            <Input
              id="cls-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Physics"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={submitting || !name.trim()}
            className="bg-gradient-primary shadow-glow hover:opacity-95"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({
  classroom,
  onOpenChange,
}: {
  classroom: Classroom | null;
  onOpenChange: (o: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = useMemo(() => {
    if (!classroom || typeof window === "undefined") return "";
    return `${window.location.origin}/login?invite=${classroom.invite_code}`;
  }, [classroom]);

  const copy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Dialog open={!!classroom} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add student to {classroom?.name}</DialogTitle>
          <DialogDescription>
            Share this invite link. Anyone who signs up via this link will join the
            classroom automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-sm">
            <code className="flex-1 truncate text-xs text-foreground">{inviteUrl}</code>
            <Button size="sm" variant="outline" onClick={copy} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Invite code: <code className="font-mono">{classroom?.invite_code}</code>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AiTaskDialog({
  student,
  classroomSubject,
  onClose,
}: {
  student: StudentRow | null;
  classroomSubject: string | null;
  onClose: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState(classroomSubject ?? "");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateTaskResult | null>(null);
  const [instructions, setInstructions] = useState("");
  const [teacherNote, setTeacherNote] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTopic("");
    setSubject(classroomSubject ?? "");
    setGenerating(false);
    setResult(null);
    setInstructions("");
    setTeacherNote("");
    setAssigning(false);
    setDone(false);
    setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleGenerate = async () => {
    if (!student) return;
    setGenerating(true);
    setError(null);
    try {
      const r = await generateAiTask(student.id, topic, subject);
      setResult(r);
      setInstructions(r.instructions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate suggestion");
    } finally {
      setGenerating(false);
    }
  };

  const handleAssign = async () => {
    if (!student || !result) return;
    setAssigning(true);
    setError(null);
    try {
      await assignAiTask({
        student_id: student.id,
        subject: result.subject,
        topic: result.topic,
        task_type: result.task_type as "quiz" | "lesson" | "practice",
        instructions,
        teacher_note: teacherNote || undefined,
        error_context: result.error_context,
        priority_score: result.priority_score,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign task");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={!!student} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            AI Task for {student?.full_name}
          </DialogTitle>
          <DialogDescription>
            AI picks the weakest topic based on this student's mastery and recent mistakes.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-6 text-center space-y-2">
            <Check className="mx-auto h-8 w-8 text-success" />
            <p className="font-medium">Task assigned!</p>
            <p className="text-sm text-muted-foreground">
              {student?.full_name} will see it in their Assigned Tasks.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ai-subject">Subject</Label>
                <Input
                  id="ai-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Physics"
                  disabled={!!result}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-topic">Topic (optional)</Label>
                <Input
                  id="ai-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="AI picks weakest"
                  disabled={!!result}
                />
              </div>
            </div>

            {!result && (
              <>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !subject.trim()}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white"
                >
                  {generating ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating…</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />Generate AI Suggestion</>
                  )}
                </Button>
              </>
            )}

            {result && (
              <div className="space-y-3 rounded-xl border border-violet-400/40 bg-violet-950/30 p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-full bg-violet-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-200">
                    {result.task_type}
                  </span>
                  <span className="text-sm font-semibold">{result.topic}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Mastery: {Math.round((result.current_mastery ?? 0) * 100)}%
                  </span>
                </div>
                {result.teacher_tip && (
                  <div className="rounded-lg border border-amber-400/30 bg-amber-950/30 px-3 py-2">
                    <p className="text-xs font-medium text-amber-300">AI tip for teacher</p>
                    <p className="mt-0.5 text-xs text-amber-100">{result.teacher_tip}</p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Instructions (editable)</Label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-note">Teacher note (optional)</Label>
                  <Input
                    id="ai-note"
                    value={teacherNote}
                    onChange={(e) => setTeacherNote(e.target.value)}
                    placeholder="e.g. Focus on diagrams"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {done ? "Close" : "Cancel"}
          </Button>
          {result && !done && (
            <Button
              onClick={handleAssign}
              disabled={assigning || !instructions.trim()}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign Task →"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const SAMPLE_MASTERY = [
  { subject: "Kinematics", mastery: 78 },
  { subject: "Forces", mastery: 64 },
  { subject: "Electromagnetism", mastery: 42 },
  { subject: "Cell Division", mastery: 81 },
  { subject: "Sejarah", mastery: 70 },
];

const SAMPLE_INSIGHTS = [
  {
    severity: "destructive",
    text: "Confuses velocity with acceleration in projectile motion.",
    topic: "Kinematics",
  },
  {
    severity: "warning",
    text: "Right-hand rule applied incorrectly for current direction.",
    topic: "Electromagnetism",
  },
  {
    severity: "success",
    text: "Strong grasp of mitosis vs meiosis distinction.",
    topic: "Cell Division",
  },
];

function StudentDetail({
  student,
  onBack,
}: {
  student: StudentRow;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to classrooms
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-lg font-bold text-primary-foreground shadow-glow">
            {student.full_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              {student.full_name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {student.classroom_name} • {student.school ?? "—"} •{" "}
              {student.grade ?? "—"}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
          Active
        </span>
      </div>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold">Mastery radar</h3>
          <p className="text-sm text-muted-foreground">
            Topic-level mastery snapshot for this student.
          </p>
          <div className="mt-4 h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={SAMPLE_MASTERY} outerRadius="78%">
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
                  name="Mastery"
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
          <h3 className="font-display text-lg font-semibold">Actionable insights</h3>
          <ul className="mt-4 space-y-3">
            {SAMPLE_INSIGHTS.map((i, idx) => (
              <li
                key={idx}
                className={cn(
                  "rounded-xl border p-4",
                  i.severity === "destructive"
                    ? "border-destructive/40 bg-destructive/5"
                    : i.severity === "warning"
                      ? "border-warning/40 bg-warning/5"
                      : "border-success/40 bg-success/5",
                )}
              >
                <p className="text-sm font-medium leading-snug">{i.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">{i.topic}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
