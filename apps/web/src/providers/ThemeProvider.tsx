import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_KEY = "vibe_theme";

/**
 * Manages the app's color theme.
 * - Reads the saved theme from localStorage on mount
 * - Falls back to "system" (follows OS preference) if nothing saved
 * - Applies the "dark" class to <html> when dark mode is active
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return (saved as Theme) || "system";
  });

  useEffect(() => {
    const root = document.documentElement;

    // Remove both classes first
    root.classList.remove("light", "dark");

    if (theme === "system") {
      // Follow OS preference
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(systemDark ? "dark" : "light");
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access and change the current theme.
 *
 * Usage:
 * const { theme, setTheme } = useTheme();
 * setTheme("dark");
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
