import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Lang } from "@/lib/i18n";

export type ThemeKey = "purple" | "blue" | "green" | "orange" | "red";
export type FontSize = "sm" | "md" | "lg";
export type ExamFont = "serif" | "sans";
export type PaperColour = "white" | "cream" | "blue";
export type LineStyle = "ruled" | "plain" | "graph";

export interface ExamPrefs {
  font: ExamFont;
  paperColour: PaperColour;
  showMarks: boolean;
  lineStyle: LineStyle;
  bilingualLabels: boolean;
}

export interface StudentPrefs {
  avatar: string;
  theme: ThemeKey;
  fontSize: FontSize;
  soundOn: boolean;
  examMode: boolean;
  examPrefs: ExamPrefs;
  banner: string;
  lang: Lang;
}

const DEFAULT_EXAM_PREFS: ExamPrefs = {
  font: "serif",
  paperColour: "white",
  showMarks: true,
  lineStyle: "ruled",
  bilingualLabels: true,
};

const DEFAULT: StudentPrefs = {
  avatar: "🎓",
  theme: "purple",
  fontSize: "md",
  soundOn: true,
  examMode: false,
  examPrefs: DEFAULT_EXAM_PREFS,
  banner: "galaxy",
  lang: "en",
};

const STORAGE_KEY = "kp_prefs";

export const THEMES: Record<ThemeKey, Record<string, string>> = {
  purple: {
    "--primary": "oklch(0.65 0.24 295)",
    "--primary-glow": "oklch(0.72 0.22 285)",
    "--ring": "oklch(0.65 0.24 295)",
    "--gradient-primary": "linear-gradient(135deg, oklch(0.65 0.24 295), oklch(0.70 0.22 240))",
    "--shadow-glow": "0 0 32px oklch(0.65 0.24 295 / 0.45)",
  },
  blue: {
    "--primary": "oklch(0.62 0.22 240)",
    "--primary-glow": "oklch(0.70 0.20 235)",
    "--ring": "oklch(0.62 0.22 240)",
    "--gradient-primary": "linear-gradient(135deg, oklch(0.62 0.22 240), oklch(0.65 0.20 220))",
    "--shadow-glow": "0 0 32px oklch(0.62 0.22 240 / 0.45)",
  },
  green: {
    "--primary": "oklch(0.62 0.22 145)",
    "--primary-glow": "oklch(0.70 0.20 150)",
    "--ring": "oklch(0.62 0.22 145)",
    "--gradient-primary": "linear-gradient(135deg, oklch(0.62 0.22 145), oklch(0.68 0.18 160))",
    "--shadow-glow": "0 0 32px oklch(0.62 0.22 145 / 0.45)",
  },
  orange: {
    "--primary": "oklch(0.68 0.20 55)",
    "--primary-glow": "oklch(0.74 0.18 60)",
    "--ring": "oklch(0.68 0.20 55)",
    "--gradient-primary": "linear-gradient(135deg, oklch(0.68 0.20 55), oklch(0.65 0.22 30))",
    "--shadow-glow": "0 0 32px oklch(0.68 0.20 55 / 0.45)",
  },
  red: {
    "--primary": "oklch(0.62 0.24 20)",
    "--primary-glow": "oklch(0.70 0.22 25)",
    "--ring": "oklch(0.62 0.24 20)",
    "--gradient-primary": "linear-gradient(135deg, oklch(0.62 0.24 20), oklch(0.60 0.20 0))",
    "--shadow-glow": "0 0 32px oklch(0.62 0.24 20 / 0.45)",
  },
};

export const FONT_SIZE_CLASS: Record<FontSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export const AVATARS = [
  "🎓", "🦁", "🐯", "🦊", "🐺", "🦅",
  "⚡", "🔥", "🌟", "💎", "🚀", "🎯",
  "🐼", "🐨", "🦉", "🦋", "🐬", "🦈",
  "🐸", "🐙", "🦄", "🐲", "🤖", "👾",
  "🧙", "🦸", "🌺", "🎮", "🏆", "🎨",
];

export const BANNERS: { key: string; label: string; gradient: string }[] = [
  { key: "galaxy",  label: "Galaxy",  gradient: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" },
  { key: "ocean",   label: "Ocean",   gradient: "linear-gradient(135deg, #1a6dff 0%, #00c6fb 100%)" },
  { key: "forest",  label: "Forest",  gradient: "linear-gradient(135deg, #134e5e, #71b280)" },
  { key: "sunset",  label: "Sunset",  gradient: "linear-gradient(135deg, #f7971e, #ffd200)" },
  { key: "fire",    label: "Fire",    gradient: "linear-gradient(135deg, #f12711, #f5af19)" },
  { key: "sakura",  label: "Sakura",  gradient: "linear-gradient(135deg, #f8c0c0, #e886a9)" },
  { key: "royal",   label: "Royal",   gradient: "linear-gradient(135deg, #141e30, #243b55)" },
  { key: "aurora",  label: "Aurora",  gradient: "linear-gradient(135deg, #00c9ff, #92fe9d)" },
  { key: "dusk",    label: "Dusk",    gradient: "linear-gradient(135deg, #2c3e50, #fd746c)" },
  { key: "jade",    label: "Jade",    gradient: "linear-gradient(135deg, #11998e, #38ef7d)" },
];

function readFromStorage(): StudentPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<StudentPrefs>) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function useStudentPrefs() {
  const [prefs, setPrefs] = useState<StudentPrefs>(readFromStorage);
  const userIdRef = useRef<string | null>(null);

  // On mount: resolve user id, then merge DB prefs over localStorage
  useEffect(() => {
    let cancelled = false;

    async function loadFromDb() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      userIdRef.current = user.id;

      const { data, error } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled || error || !data?.preferences) return;

      // DB wins for avatar / theme / banner; merge over localStorage values
      const dbPrefs = data.preferences as Partial<StudentPrefs>;
      setPrefs((prev) => {
        const merged: StudentPrefs = { ...prev, ...dbPrefs };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });
    }

    loadFromDb();
    return () => { cancelled = true; };
  }, []);

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    const vars = THEMES[prefs.theme];
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [prefs.theme]);

  const save = (next: Partial<StudentPrefs>) => {
    setPrefs((prev) => {
      const merged: StudentPrefs = { ...prev, ...next };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

      // Fire-and-forget upsert to Supabase — don't block the UI
      const userId = userIdRef.current;
      if (userId) {
        supabase
          .from("profiles")
          .upsert({ id: userId, preferences: merged as unknown as Json }, { onConflict: "id" })
          .then(() => { /* intentionally ignored */ });
      }

      return merged;
    });
  };

  return { prefs, save };
}
