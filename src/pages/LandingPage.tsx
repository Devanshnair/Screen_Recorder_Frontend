import { AlertTriangle, X, Video, List, User, LogOut } from "lucide-react"
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { FloatingBar } from "../components/Floatingbar";
import { Modal } from "../components/Modal";
import { LazyVideo } from "../components/LazyVideo";
import { clearPendingRecording, loadPendingRecording } from "../utils/recordingStorage";

export default function LandingPage() {
  const [toast, setToast] = useState<string | null>("");
  const [showBar, setShowBar] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { user } = useAuth();
  const navigate = useNavigate();

  const heroVideoSrc = useMemo(() => "/ScreenRecorder_Hero_Vid.mp4", [])

  const handleStartRecording = () => {
    setShowBar(true);
  };

  const handleViewRecordings = () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/recordings' } } });
      return;
    }
    navigate('/recordings');
  };

  // Restore a pending recording after login
  useEffect(() => {
    const shouldResume = sessionStorage.getItem('resumeRecordingAfterLogin') === '1';
    if (!user || !shouldResume) return;

    (async () => {
      try {
        const pending = await loadPendingRecording();
        if (pending) {
          const url = URL.createObjectURL(pending.blob);
          setVideoBlob(pending.blob);
          setPreviewUrl(url);
          setShowModal(true);
          await clearPendingRecording();
        }
      } finally {
        sessionStorage.removeItem('resumeRecordingAfterLogin');
      }
    })();
  }, [user]);

  return (
    <div className="min-h-dvh bg-white font-sans text-slate-900">
      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-4 z-50 w-auto max-w-sm animate-in slide-in-from-right-full duration-300">
          <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50/95 via-violet-50 to-violet-50/95 px-4 py-3 shadow-lg backdrop-blur-sm">
            <div className="flex items-start gap-3">
              {/* Warning Icon */}
              <div className="flex-shrink-0 mt-1.5">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              {/* Message */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 leading-relaxed">
                  {toast}
                </p>
              </div>
              {/* Close Button */}
              <button
                onClick={() => setToast(null)}
                className="flex-shrink-0 rounded-lg p-1 text-violet-400 hover:text-violet-600 hover:bg-violet-100/50 transition-colors"
              >
                <X className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      )}
    
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pt-28 pb-16">
        {/* HERO */}
        <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-pretty text-4xl font-bold sm:text-5xl">Record your screen in seconds</h1>
        <p className="mt-4 text-slate-600">
            One-click recording with live controls, microphone support, and quick export. Built for speed and
            simplicity.
        </p>

        {/* Actions */}
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
            onClick={handleStartRecording}
            className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-600"
            >
            <span className="inline-block h-2 w-2 rounded-full bg-white" />
            Start Recording
            </button>
            <button
            onClick={handleViewRecordings}
            className="inline-flex items-center gap-2 rounded-full border border-violet-600 px-5 py-3 text-sm font-semibold text-violet-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-violet-600"
            >
            View Recordings
            </button>
        </div>

        {/* Demo video placeholder */}
        <div className="mt-10">
            <div className="mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-2xl border border-violet-600/30 shadow-lg">
              <LazyVideo
                src={heroVideoSrc}
                className="h-full w-full object-cover"
                playbackRate={2}
              />
            </div>
        </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="mx-auto mt-24 max-w-5xl">
        <h2 className="text-balance text-3xl font-semibold text-slate-900 md:text-4xl">
            Everything you need to record and share
        </h2>
        <p className="mt-2 text-lg text-slate-600">Fast, private, and simple—focused on the core assignment requirements.</p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
            <FeatureCard
            title="Start & Stop with Timer"
            body="Record the active tab and mic audio with clear controls and a live counter. Automatically stops at 3 minutes."
            accent="orange"
            />
            <FeatureCard
            title="Preview & Download"
            body="Review your clip immediately after stopping, and save it locally with a single click."
            accent="violet"
            />
            <FeatureCard
            title="Upload & List"
            body="Send your recording to the Node/Express API and list uploads with title, size, created date, and inline playback."
            accent="orange"
            />
        </div>

        <div className="mt-6 rounded-lg bg-emerald-600/5 p-4 text-base text-slate-600">
            Note: Recording requires Chrome support for tab capture. Safari support is optional and can show a friendly
            fallback.
        </div>
        </section>
      </main>

      {/* Floating recording controls */}
      <FloatingBar
        visible={showBar}
        setVisible={setShowBar}
        setToast={setToast}
        setShowModal={setShowModal}
        setPreviewUrl={setPreviewUrl}
        setVideoBlob={setVideoBlob}
      />

      {/* Preview Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        videoUrl={previewUrl}
        videoBlob={videoBlob}
      />
    </div>
  )
}

export const Navbar = () => {

  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  const { user, setUser } = useAuth()
  const navigate  = useNavigate()

    const handleViewRecordings = () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/recordings' } } });
      return;
    }
    navigate('/recordings');
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setShowUserDropdown(false);
    navigate('/');
  };
  
  return (
        <header className="fixed inset-x-0 top-0 z-40 px-10">
        {/* Centered translucent brand badge */}
        <div className="absolute left-1/2 top-4 -translate-x-1/2">
          <div className="rounded-full border border-violet-600/30 bg-white/60 px-6 py-2 backdrop-blur-md shadow-sm">
            <span className="text-sm font-semibold tracking-wide text-slate-900 cursor-default">ScreenRecorder</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-end gap-4 px-4 py-4">
          <nav className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                location.pathname === '/' 
                  ? 'bg-violet-100 text-violet-700' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Video className="w-4 h-4" />
              Record
            </button>
            <button
              onClick={handleViewRecordings}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                location.pathname === '/recordings' 
                  ? 'bg-violet-100 text-violet-700' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <List className="w-4 h-4" />
              My Recordings
            </button>
          </nav>
          
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="inline-flex items-center justify-center rounded-full bg-gray-300 w-9 h-9 text-white hover:bg-gray-400 focus:outline-none transition-colors"
              >
                <User className="w-5 h-5" />
              </button>
              
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.fullName}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus:outline-none cursor-pointer">
              Login
            </button>
          )}
        </div>
      </header>
  )
}

function FeatureCard({ title, body, accent }: { title: string; body: string; accent: "orange" | "violet" }) {
  const pill = accent === "orange" ? "bg-orange-600" : "bg-violet-600"
  
  return (
    <div className="h-full rounded-2xl border border-violet-600/30 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${pill}`} aria-hidden="true" />
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="mt-2 text-base leading-relaxed text-slate-600">{body}</p>
    </div>
  )
}

