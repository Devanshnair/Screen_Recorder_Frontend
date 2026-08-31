import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative h-9 w-9 overflow-hidden rounded-md text-slate-700 dark:text-slate-200"
    >
      {/* Sun icon for dark mode (primary orange) */}
      <Sun
        className={`h-4 w-4 text-orange-500 transition-all duration-300 ease-in-out ${
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
      {/* Moon icon for light mode (black) */}
      <Moon
        className={`absolute h-4 w-4 text-slate-900 transition-all duration-300 ease-in-out ${
          isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        }`}
      />
    </Button>
  )
}
