import { useEffect, useState, useRef, useMemo } from "react"
import { Play, Download, Calendar, HardDrive, RefreshCw, SearchIcon } from "lucide-react"
import { Base_Url } from "../App"
import { formatDate, formatFileSize } from "../utils/validation"
import { Navbar } from "./LandingPage"

interface Recording {
  _id: string
  title: string
  filename: string
  size: number
  createdAt: string
  url?: string
}

function VideoPlayer({ recordingId }: { recordingId: string }) {
  const [videoSrc, setVideoSrc] = useState<string>("")
  const [error, setError] = useState<string>("")
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const fetchVideoBlob = async () => {
      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch(`${Base_Url}/api/recordings/${recordingId}`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            "ngrok-skip-browser-warning": "true",
          },
        })

        if (response.ok) {
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          setVideoSrc(url)
        } else {
          setError("Failed to load video")
        }
      } catch (err) {
        setError("Failed to load video")
        console.error("Video fetch error:", err)
      }
    }

    fetchVideoBlob()

    // Cleanup blob URL on unmount
    return () => {
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc)
      }
    }
  }, [recordingId])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        <p>{error}</p>
      </div>
    )
  }

  if (!videoSrc) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white">Loading video...</div>
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      src={videoSrc}
      controls
      className="w-full h-full"
      onError={() => setError("Video playback error")}
    >
      Your browser does not support video playback.
    </video>
  )
}

export function MyRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  // New: search state (UI only)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchRecordings()

    // Listen for refresh events from successful uploads
    const handleRefresh = () => {
      fetchRecordings()
    }

    window.addEventListener("refreshRecordings", handleRefresh)
    return () => window.removeEventListener("refreshRecordings", handleRefresh)
  }, [])

  const fetchRecordings = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("accessToken")
      const response = await fetch(`${Base_Url}/api/recordings`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          "ngrok-skip-browser-warning": "true",
        },
      })

      if (response.ok) {
        const apiResponse = await response.json()
        // Extract the data array from the ApiResponse format
        setRecordings(Array.isArray(apiResponse.data) ? apiResponse.data : [])
      } else if (response.status === 401) {
        setError("Please log in to view your recordings")
        // Clear invalid token
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
      } else {
        throw new Error("Failed to fetch recordings")
      }
    } catch (err) {
      setError("Failed to load recordings")
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = (recordingId: string) => {
    setPlayingId(playingId === recordingId ? null : recordingId)
  }

  const handleDownload = async (recording: Recording) => {
    try {
      // Prefer a provided URL if available (e.g., pre-signed URL or blob/data URL from backend)
      if (recording.url) {
        const a = document.createElement("a")
        a.href = recording.url
        a.download = `${recording.title}.webm`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        return
      }

      const token = localStorage.getItem("accessToken")
      const response = await fetch(`${Base_Url}/api/recordings/${recording._id}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          "ngrok-skip-browser-warning": "true",
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        // Use the title instead of the generated filename, with .webm extension
        a.download = `${recording.title}.webm`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  // New: filter recordings by search query (UI-only, does not alter fetch/storage)
  const filteredRecordings = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return recordings
    return recordings.filter((r) => r.title.toLowerCase().includes(q))
  }, [recordings, search])

  return (
    <div className="space-y-5 p-14 py-28 ">
      <Navbar />
      {/* Header with title, search, and refresh */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Your Recordings</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recordings..."
              className="w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              aria-label="Search recordings by title"
            />
          </div>
          <button
            onClick={fetchRecordings}
            className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Results info when searching */}
      {search.trim() && (
        <p className="text-sm text-slate-600">
          Showing {filteredRecordings.length} of {recordings.length} recording{recordings.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Empty state for no matches when searching */}
      {search.trim() && filteredRecordings.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <div className="mb-3 text-slate-400">
            <SearchIcon className="mx-auto h-6 w-6" />
          </div>
          <p className="text-slate-700 font-medium">No matches for “{search}”.</p>
          <p className="text-slate-500 text-sm mt-1">Try a different title.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRecordings.map((recording) => (
            <div
              key={recording._id}
              className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-semibold text-slate-900">{recording.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-gray-700 -">
                      <HardDrive className="h-4 w-4" />
                      {formatFileSize(recording.size)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-gray-700">
                      <Calendar className="h-4 w-4" />
                      {formatDate(recording.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="ml-2 flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handlePlay(recording._id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-orange-700 transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    {playingId === recording._id ? "Hide" : "Play"}
                  </button>
                  <button
                    onClick={() => handleDownload(recording)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>

              {playingId === recording._id && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
                    <VideoPlayer recordingId={recording._id} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
