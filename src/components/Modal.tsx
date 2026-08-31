"use client"

import { CopyCheck as CloudCheck, Download } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Base_Url } from "../App"
import { generateDefaultFilename } from "../utils/validation"
import { useAuth } from "../contexts/AuthContext"
import { savePendingRecording, clearPendingRecording } from "../utils/recordingStorage"
import { useRecording } from "../contexts/RecordingContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

type Props = {
  open: boolean
  onClose: () => void
  videoUrl: string | null
  videoBlob: Blob | null
}

export function Modal({ open, onClose, videoUrl, videoBlob }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [previewImage, setPreviewImage] = useState<string>("")
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")

  const { user } = useAuth()
  const { navigateToLogin } = useRecording()

  const handleSave = async () => {
    if (!videoBlob || !fileName.trim()) {
      setUploadStatus("error")
      return
    }

    if (!user) {
      await savePendingRecording({ blob: videoBlob, filename: fileName })
      sessionStorage.setItem("resumeRecordingAfterLogin", "1")
      navigateToLogin()
      return
    }

    setIsUploading(true)
    setUploadStatus("idle")

    try {
      const formData = new FormData()
      formData.append("recording", videoBlob, `${fileName}.webm`)
      formData.append("title", fileName)
      formData.append("size", videoBlob.size.toString())

      const token = localStorage.getItem("accessToken")
      const response = await fetch(`${Base_Url}/api/recordings`, {
        method: "POST",
        body: formData,
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          "ngrok-skip-browser-warning": "true",
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Upload successful:", result)
        setUploadStatus("success")
        setTimeout(async () => {
          await clearPendingRecording()
          if (videoUrl) {
            try { URL.revokeObjectURL(videoUrl) } catch {}
          }
          onClose()
          setUploadStatus("idle")
          window.dispatchEvent(new CustomEvent("refreshRecordings"))
        }, 1500)
      } else {
        const errorData = await response.text()
        console.error("Upload failed:", errorData)
        throw new Error(`Upload failed: ${response.status}`)
      }
    } catch (error) {
      console.error("Upload error:", error)
      setUploadStatus("error")
    } finally {
      setIsUploading(false)
    }
  }

  useEffect(() => {
    if (open) {
      const defaultName = generateDefaultFilename()
      setFileName(defaultName)
    }
  }, [open])

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.load()

      const video = videoRef.current
      const handleLoadedData = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (ctx) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          video.currentTime = Math.min(1, video.duration * 0.1)

          const handleSeeked = () => {
            ctx.drawImage(video, 0, 0)
            const previewDataUrl = canvas.toDataURL("image/jpeg", 0.8)
            setPreviewImage(previewDataUrl)
            video.removeEventListener("seeked", handleSeeked)
          }

          video.addEventListener("seeked", handleSeeked)
        }
      }

      video.addEventListener("loadeddata", handleLoadedData)
      return () => {
        video.removeEventListener("loadeddata", handleLoadedData)
      }
    }
  }, [videoUrl])

  const handleClose = async () => {
    const resumeFlag = sessionStorage.getItem("resumeRecordingAfterLogin")
    if (!resumeFlag) {
      await clearPendingRecording()
    }
    if (videoUrl) {
      try { URL.revokeObjectURL(videoUrl) } catch {}
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border-violet-600/30 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">Preview &amp; Export</DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            Review your recording and customize the filename
          </DialogDescription>
        </DialogHeader>

        <div>
          {/* Filename Input */}
          <div className="mb-6">
            <label htmlFor="filename" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Filename
            </label>
            <div className="relative">
              <Input
                id="filename"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="pr-14 bg-white dark:bg-slate-800 dark:text-slate-100 focus-visible:ring-violet-400"
                placeholder="Enter filename..."
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
                .webm
              </span>
            </div>
          </div>

          {/* Video Preview */}
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 shadow-inner bg-gray-50 dark:bg-slate-950">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                preload="metadata"
                controls
                className="h-full w-full object-contain bg-black"
                poster={previewImage || undefined}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 text-slate-300 mb-3">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Your recording preview will appear here</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button
              variant="outline"
              asChild
              className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <a
                href={videoUrl || undefined}
                download={videoUrl && fileName ? `${fileName}.webm` : undefined}
              >
                <Download className="w-5 h-5" />
                Download
              </a>
            </Button>

            <Button
              onClick={handleSave}
              disabled={isUploading || !fileName.trim()}
              className={
                uploadStatus === "success"
                  ? "bg-green-600 hover:bg-green-700"
                  : uploadStatus === "error"
                    ? "bg-red-600 hover:bg-red-700"
                    : isUploading
                      ? "bg-orange-400 cursor-not-allowed"
                      : "bg-orange-600 hover:bg-orange-700"
              }
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : uploadStatus === "success" ? (
                <>
                  <CloudCheck className="w-5 h-5" />
                  Uploaded!
                </>
              ) : uploadStatus === "error" ? (
                <>
                  <CloudCheck className="w-5 h-5" />
                  Try Again
                </>
              ) : (
                <>
                  <CloudCheck className="w-5.5 h-5.5" />
                  Save to Cloud
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
