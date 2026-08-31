import { List, User, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/ThemeToggle"

export function Navbar() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  const handleViewRecordings = () => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/recordings" } } })
      return
    }
    navigate("/recordings")
  }

  const handleLogout = () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    setUser(null)
    navigate("/")
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      {/* Centered translucent brand pill */}
      <div className="absolute left-1/2 top-4 -translate-x-1/2">
        <button
          onClick={() => navigate("/")}
          className="rounded-full border border-violet-600/25 dark:border-violet-500/25 bg-white/70 dark:bg-slate-900/80 px-6 py-2 backdrop-blur-md shadow-sm cursor-pointer hover:border-violet-500/60 transition-colors duration-200"
        >
          <span className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white">
            ScreenRecorder
          </span>
        </button>
      </div>

      {/* Right-side controls */}
      <div className="flex items-center justify-end gap-1 px-6 py-4">
        <nav className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewRecordings}
            className={
              window.location.pathname === "/recordings"
                ? "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-950"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }
          >
            <List className="w-3.5 h-3.5" />
            My Recordings
          </Button>
        </nav>

        {/* Animated theme toggle with Lucide icons */}
        <ThemeToggle />

        {/* Divider */}
        <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />

        {/* User menu / Login */}
        {user ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 h-8 w-8"
                aria-label="User menu"
              >
                <User className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal py-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.fullName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 focus:bg-red-50 dark:focus:bg-red-950/40 font-medium cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            onClick={() => navigate("/login")}
            size="sm"
            className="rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
          >
            Login
          </Button>
        )}
      </div>
    </header>
  )
}
