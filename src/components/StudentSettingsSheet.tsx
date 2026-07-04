import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useStudentPrefs, THEMES, type ThemeKey, type FontSize } from "@/hooks/useStudentPrefs";
import { ChevronRight } from "lucide-react";

const AVATARS = ["🎓", "🦁", "🐯", "🦊", "🐺", "🦅", "⚡", "🔥", "🌟", "💎", "🚀", "🎯"];

const THEME_OPTIONS: { key: ThemeKey; label: string; primary: string }[] = [
  { key: "purple", label: "Purple", primary: THEMES.purple["--primary"] },
  { key: "blue",   label: "Blue",   primary: THEMES.blue["--primary"] },
  { key: "green",  label: "Green",  primary: THEMES.green["--primary"] },
  { key: "orange", label: "Orange", primary: THEMES.orange["--primary"] },
  { key: "red",    label: "Red",    primary: THEMES.red["--primary"] },
];

const FONT_OPTIONS: { key: FontSize; label: string; size: string }[] = [
  { key: "sm", label: "A", size: "0.75rem" },
  { key: "md", label: "A", size: "0.875rem" },
  { key: "lg", label: "A", size: "1.05rem" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenExamPrefs?: () => void;
}

export function StudentSettingsSheet({ open, onClose, onOpenExamPrefs }: Props) {
  const { prefs, save } = useStudentPrefs();

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-72 max-w-full overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-display text-xl">My Style</SheetTitle>
          <p className="text-xs text-muted-foreground">Saved automatically to this device.</p>
        </SheetHeader>

        {/* Avatar */}
        <section className="mb-6">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Avatar
          </div>
          <div className="grid grid-cols-6 gap-2">
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => save({ avatar: emoji })}
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-xl text-xl transition-all",
                  prefs.avatar === emoji
                    ? "bg-primary/20 ring-2 ring-primary scale-110"
                    : "bg-card hover:bg-muted",
                )}
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </section>

        {/* Accent colour */}
        <section className="mb-6">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Accent Colour
          </div>
          <div className="flex gap-3">
            {THEME_OPTIONS.map(({ key, label, primary }) => (
              <button
                key={key}
                onClick={() => save({ theme: key })}
                title={label}
                style={{ background: primary }}
                className={cn(
                  "h-9 w-9 rounded-full border-2 transition-all",
                  prefs.theme === key
                    ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-115 border-white"
                    : "border-transparent opacity-70 hover:opacity-100 hover:scale-105",
                )}
              />
            ))}
          </div>
        </section>

        {/* Font size */}
        <section className="mb-6">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Text Size
          </div>
          <div className="flex gap-2">
            {FONT_OPTIONS.map(({ key, label, size }) => (
              <button
                key={key}
                onClick={() => save({ fontSize: key })}
                style={{ fontSize: size }}
                className={cn(
                  "h-10 flex-1 rounded-xl border-2 font-bold transition-all",
                  prefs.fontSize === key
                    ? "border-primary bg-primary/10 text-primary scale-105"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Small · Medium · Large</p>
        </section>

        {/* Sound toggle */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-border bg-card/60 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Sound Effects</div>
            <div className="text-xs text-muted-foreground">Correct / wrong answer sounds</div>
          </div>
          <Switch
            checked={prefs.soundOn}
            onCheckedChange={(v) => save({ soundOn: v })}
          />
        </div>

        {/* Exam Mode */}
        <section>
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            SPM Exam Mode
          </div>
          <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-semibold">Exam Paper Layout</div>
                <div className="text-xs text-muted-foreground">
                  Replaces the game card with an SPM booklet format
                </div>
              </div>
              <Switch
                checked={prefs.examMode}
                onCheckedChange={(v) => save({ examMode: v })}
              />
            </div>
            {prefs.examMode && onOpenExamPrefs && (
              <button
                onClick={() => { onClose(); onOpenExamPrefs(); }}
                className="flex w-full items-center justify-between border-t border-border px-4 py-2.5 text-sm text-primary hover:bg-primary/5 transition"
              >
                <span>Customise exam paper</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>
      </SheetContent>
    </Sheet>
  );
}
