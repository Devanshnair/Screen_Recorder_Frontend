import { useState, useEffect, useMemo } from "react"
import { AlertTriangle, X } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { LazyVideo } from "@/components/LazyVideo"
import { useRecording } from "@/contexts/RecordingContext"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/Navbar"

export default function LandingPage() {
  const [toast, setToast] = useState<string | null>(null)
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showBar, registerToast } = useRecording()
  const heroVideoSrc = useMemo(() => "/ScreenRecorder_Hero_Vid.mp4", [])

  useEffect(() => {
    registerToast(setToast)
  }, [registerToast])

  const handleStartRecording = () => showBar()
  const handleViewRecordings = () => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/recordings" } } })
      return
    }
    navigate("/recordings")
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#090a10] text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-x-hidden">
      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-4 z-50 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-start gap-3 rounded-xl border border-violet-200 dark:border-violet-900/50 bg-white dark:bg-slate-900 px-4 py-3 shadow-lg">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-slate-700 dark:text-slate-200">{toast}</p>
            <Button variant="ghost" size="icon" onClick={() => setToast(null)} className="h-5 w-5 shrink-0 -mr-1">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <Navbar />

      <main className="mx-auto max-w-5xl px-4 pt-24 pb-24">
        {/* ── Hero ── */}
        <section className="mx-auto max-w-3xl text-center" style={{ animation: "fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.03em] leading-[1.08] text-slate-900 dark:text-white"
            style={{ animation: "fadeUp 0.6s 80ms cubic-bezier(0.16,1,0.3,1) both" }}
          >
            Record your screen
            <br />
            <span className="text-slate-400 dark:text-slate-500">in seconds.</span>
          </h1>

          <p
            className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-400 max-w-xl mx-auto"
            style={{ animation: "fadeUp 0.6s 160ms cubic-bezier(0.16,1,0.3,1) both" }}
          >
            Capture your screen with microphone audio, pause and review instantly,
            then save or share — all without leaving your browser.
          </p>

          <div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
            style={{ animation: "fadeUp 0.6s 240ms cubic-bezier(0.16,1,0.3,1) both" }}
          >
            <Button
              onClick={handleStartRecording}
              className="rounded-full bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white px-8 py-3 h-auto text-sm font-semibold shadow-sm transition-all duration-150"
            >
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-white/90" />
              Start Recording
            </Button>
            <Button
              variant="outline"
              onClick={handleViewRecordings}
              className="rounded-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:border-slate-400 dark:hover:border-slate-600 px-8 py-3 h-auto text-sm font-semibold transition-all duration-150"
            >
              View My Recordings
            </Button>
          </div>

          {/* Hero video */}
          <div
            className="mt-14"
            style={{ animation: "scaleIn 0.7s 320ms cubic-bezier(0.16,1,0.3,1) both" }}
          >
            <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md bg-black">
              <LazyVideo src={heroVideoSrc} className="h-full w-full object-cover" playbackRate={2} />
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="mt-28">
          <div style={{ animation: "fadeUp 0.6s 400ms cubic-bezier(0.16,1,0.3,1) both" }}>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Everything you need, nothing you don't.
            </h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400 text-base">
              Built for speed. Works instantly, right in your browser.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3" style={{ animation: "fadeUp 0.6s 480ms cubic-bezier(0.16,1,0.3,1) both" }}>
            <FeatureCard
              dot="orange"
              title="One-click recording"
              body="Hit record and you're live. Capture up to 3 minutes with your microphone included."
            />
            <FeatureCard
              dot="violet"
              title="Instant preview"
              body="Review your clip the moment you stop. No processing, no waiting — it's ready immediately."
            />
            <FeatureCard
              dot="orange"
              title="Save &amp; revisit"
              body="Your recordings are stored in your account. Replay, download, or share them any time."
            />
          </div>
        </section>
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1);    }
        }
      `}</style>
    </div>
  )
}

function FeatureCard({ dot, title, body }: { dot: "orange" | "violet"; title: string; body: string }) {
  return (
    <div className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 transition-colors duration-200 hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-center gap-2.5 mb-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${dot === "orange" ? "bg-orange-500" : "bg-violet-500"}`}
        />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white" dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400" dangerouslySetInnerHTML={{ __html: body }} />
    </div>
  )
}
