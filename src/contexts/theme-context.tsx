import * as React from "react"

export type Theme = "default" | "elite"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isElite: boolean
}

const STORAGE_KEY = "mv-dashboard-theme"

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === "elite" || saved === "default") {
        return saved
      }
    } catch {
      // Ignore localStorage errors (e.g. incognito sandbox)
    }
    return "default"
  })

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "elite" ? "default" : "elite")
  }, [theme, setTheme])

  React.useEffect(() => {
    const root = document.documentElement
    if (theme === "elite") {
      root.classList.add("theme-elite")
    } else {
      root.classList.remove("theme-elite")
    }
  }, [theme])

  const isElite = theme === "elite"

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isElite,
    }),
    [theme, setTheme, toggleTheme, isElite]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
