"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { Play, Download, Calendar, HardDrive, RefreshCw, SearchIcon, Video, AlertTriangle } from "lucide-react"
import { Base_Url } from "../App"
import { formatDate, formatFileSize } from "../utils/validation"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRecording } from "@/contexts/RecordingContext"

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
    let active = true
    let blobUrl = ""

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
          if (active) {
            blobUrl = URL.createObjectURL(blob)
            setVideoSrc(blobUrl)
          }
        } else {
          if (active) setError("Failed to load video")
        }
      } catch (err) {
        if (active) setError("Failed to load video")
        console.error("Video fetch error:", err)
      }
    }

    fetchVideoBlob()

    return () => {
      active = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [recordingId])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[220px] bg-slate-950 text-slate-400 p-6 text-center">
        <AlertTriangle className="h-6 w-6 text-red-400 mb-2" />
        <p className="text-sm font-medium">{error}</p>
      </div>
    )
  }

  if (!videoSrc) {
    return (
      <div className="flex items-center justify-center h-full min-h-[220px] bg-slate-950 text-slate-400">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          Loading video playback...
        </div>
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      src={videoSrc}
      controls
      autoPlay
      className="w-full h-full object-contain max-h-[540px] bg-black"
      onError={() => setError("Video playback error")}
    >
      Your browser does not support video playback.
    </video>
  )
}

export function MyRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const { showBar } = useRecording()

  useEffect(() => {
    fetchRecordings()

    const handleRefresh = () => {
      fetchRecordings()
    }

    window.addEventListener("refreshRecordings", handleRefresh)
    return () => window.removeEventListener("refreshRecordings", handleRefresh)
  }, [])

  const fetchRecordings = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem("accessToken")
      const response = await fetch(`${Base_Url}/api/recordings`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          "ngrok-skip-browser-warning": "true",
        },
      })

      if (response.ok) {
        const apiResponse = await response.json()
        setRecordings(Array.isArray(apiResponse.data) ? apiResponse.data : [])
      } else if (response.status === 401) {
        setError("Please log in to view your recordings")
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
      } else {
        throw new Error("Failed to fetch recordings")
      }
    } catch (err) {
      setError("Unable to connect to server. Please try refreshing.")
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
        a.download = `${recording.title}.webm`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error("Download error:", err)
    }
  }

  const filteredRecordings = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return recordings
    return recordings.filter((r) => r.title.toLowerCase().includes(q))
  }, [recordings, search])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090a10] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />

      {/* Main Content Container with Controlled Max Width & Spacing */}
      <main className="mx-auto max-w-5xl px-6 pt-32 pb-24">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              My Recordings
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Browse, replay, and manage your captured screen recordings.
            </p>
          </div>

          {/* Controls: Search & Refresh */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recordings by title..."
                className="h-10 pl-10 pr-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus-visible:ring-orange-500 shadow-sm"
                aria-label="Search recordings by title"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecordings}
              disabled={loading}
              className="h-10 px-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Search Results Count */}
        {search.trim() && !loading && (
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Found {filteredRecordings.length} recording{filteredRecordings.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Recordings List / Empty States */}
        <div className="mt-6 space-y-4">
          {loading && recordings.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading your recordings...</p>
            </div>
          ) : recordings.length === 0 ? (
            /* Empty state when no recordings exist */
            <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 mb-4">
                <Video className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No recordings yet</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Capture your screen, tab, or window. When you save a recording, it will appear right here.
              </p>
              <Button
                onClick={showBar}
                className="mt-6 rounded-full bg-orange-600 hover:bg-orange-700 text-white px-6 shadow-sm"
              >
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-white" />
                Start Recording
              </Button>
            </Card>
          ) : filteredRecordings.length === 0 ? (
            /* Search yielded no matches */
            <Card className="p-10 text-center border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
                <SearchIcon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">No matching recordings</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                No results found for "{search}". Try searching with a different keyword.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch("")}
                className="mt-4 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30"
              >
                Clear Search
              </Button>
            </Card>
          ) : (
            /* Recordings List */
            filteredRecordings.map((recording) => (
              <Card
                key={recording._id}
                className="group border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm hover:shadow-md overflow-hidden rounded-2xl"
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Recording info */}
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                        {recording.title}
                      </h2>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary" className="gap-1 px-3 py-1 font-normal text-slate-600 dark:text-slate-300">
                          <HardDrive className="h-3.5 w-3.5 text-slate-400" />
                          {formatFileSize(recording.size)}
                        </Badge>
                        <Badge variant="secondary" className="gap-1 px-3 py-1 font-normal text-slate-600 dark:text-slate-300">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {formatDate(recording.createdAt)}
                        </Badge>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0">
                      <Button
                        size="sm"
                        onClick={() => handlePlay(recording._id)}
                        className={`rounded-xl px-4 text-xs font-semibold transition-all ${
                          playingId === recording._id
                            ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                            : "bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                        }`}
                      >
                        <Play className="h-3.5 w-3.5 mr-1" />
                        {playingId === recording._id ? "Close Video" : "Play"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(recording)}
                        className="rounded-xl px-4 text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>

                  {/* Inline Video Player */}
                  {playingId === recording._id && (
                    <div className="mt-5 border-t border-slate-100 dark:border-slate-800/80 pt-5">
                      <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-black shadow-inner">
                        <VideoPlayer recordingId={recording._id} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
