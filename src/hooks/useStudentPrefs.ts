import { useState, useEffect } from "react";

export type ThemeKey = "purple" | "blue" | "green" | "orange" | "red";
export type FontSize = "sm" | "md" | "lg";

export interface StudentPrefs {
  avatar: string;
  theme: ThemeKey;
  fontSize: FontSize;
  soundOn: boolean;
}

const DEFAULT: StudentPrefs = {
  avatar: "🎓",
  theme: "purple",
  fontSize: "md",
  soundOn: true,
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

export function useStudentPrefs() {
  const [prefs, setPrefs] = useState<StudentPrefs>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<StudentPrefs>) } : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });

  const save = (next: Partial<StudentPrefs>) => {
    setPrefs((prev) => {
      const merged = { ...prev, ...next };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  useEffect(() => {
    const vars = THEMES[prefs.theme];
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [prefs.theme]);

  return { prefs, save };
}
