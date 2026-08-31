"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { loadPendingRecording /*, clearPendingRecording*/ } from "../utils/recordingStorage" // don't clear on restore; we clear on close/save
import { useAuth } from "./AuthContext"
import { useNavigate } from "react-router-dom"

type ToastSetter = React.Dispatch<React.SetStateAction<string | null>> | null

type RecordingContextValue = {
  // UI state
  isBarVisible: boolean
  showBar: () => void
  hideBar: () => void

  // Recorder state
  isRecording: boolean
  isPaused: boolean
  isMicOn: boolean
  elapsedSeconds: number

  // Devices
  audioInputDevices: MediaDeviceInfo[]
  currentMicInput: string | null
  changeMicrophone: (deviceId: string) => void
  toggleMic: () => void

  // Actions
  start: () => Promise<void>
  stop: () => void
  pauseResume: () => void
  closeBar: () => void

  // Preview/Modal
  previewUrl: string | null
  videoBlob: Blob | null
  showModal: boolean
  setShowModal: (open: boolean) => void
  showPreviewFromBlob: (blob: Blob) => void
  clearPreview: () => void

  // Navigation helper for login redirect
  navigateToLogin: () => void

  // Toast bridge (LandingPage can register its setter so provider can display messages)
  registerToast: (setter: ToastSetter) => void
}

const RecordingContext = createContext<RecordingContextValue | null>(null)

export function useRecording(): RecordingContextValue {
  const ctx = useContext(RecordingContext)
  if (!ctx) throw new Error("useRecording must be used within RecordingProvider")
  return ctx
}

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  // Get auth context to watch for user login
  const { user } = useAuth()
  // Get navigation function
  const navigate = useNavigate()
  
  // UI
  const [isBarVisible, setIsBarVisible] = useState(false)

  // Recorder state
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isMicOn, setIsMicOn] = useState(true)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Devices
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([])
  const [currentMicInput, setCurrentMicInput] = useState<string | null>(null)

  // Preview/Modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Toast
  const toastSetterRef = useRef<ToastSetter>(null)
  const notify = useCallback((msg: string) => {
    if (toastSetterRef.current) toastSetterRef.current(msg)
    else console.warn("[recording/toast]", msg)
  }, [])

  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioNodesRef = useRef<any>(null)
  const displayStreamRef = useRef<MediaStream | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const intervalRef = useRef<number | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const enumerateMics = useCallback(async () => {
    try {
      if (!navigator?.mediaDevices?.enumerateDevices) {
        notify("Media devices not supported in this browser")
        return
      }
      const devices = await navigator.mediaDevices.enumerateDevices()
      const inputs = devices.filter((d) => d.kind === "audioinput")
      // normalize labels and remove duplicates
      const processed = inputs.map((dev) => {
        let newLabel = dev.label
        if (newLabel.toLowerCase().includes("default -")) newLabel = newLabel.replace(/default\s*-\s*/i, "").trim()
        if (newLabel.toLowerCase().includes("communications -"))
          newLabel = newLabel.replace(/communications\s*-\s*/i, "").trim()
        return { ...dev, label: newLabel }
      })
      const noDupes = processed.filter((dev, idx, self) => self.findIndex((d) => d.label === dev.label) === idx)
      setAudioInputDevices(noDupes)
      if (!currentMicInput && noDupes[0]?.deviceId) setCurrentMicInput(noDupes[0].deviceId)
    } catch (e) {
      console.warn("enumerateDevices failed", e)
    }
  }, [currentMicInput, notify])

  const isMicrophoneTrack = (track: MediaStreamTrack): boolean => {
    const label = track.label.toLowerCase()
    return (
      label.includes("microphone") ||
      label.includes("headset") ||
      label.includes("communications") ||
      label.includes("mic") ||
      label.includes("audio input")
    )
  }

  const getComposedDisplayAndMicStream = useCallback(
    async (micDeviceId?: string | null) => {
      if (!navigator?.mediaDevices?.getDisplayMedia) {
        throw new Error("Screen capture not supported in this browser. Please use Chrome.")
      }

      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      let micStream: MediaStream | null = null

      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true,
          })
        } else {
          notify("Microphone access not supported - recording without mic")
        }
      } catch (micErr) {
        micStream = null
        notify("Failed to capture microphone - recording without mic")
      }

      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
      const audioCtx = new AudioCtx()
      const dest = audioCtx.createMediaStreamDestination()

      // System audio
      if (displayStream.getAudioTracks().length > 0) {
        try {
          const sysSrc = audioCtx.createMediaStreamSource(new MediaStream(displayStream.getAudioTracks()))
          const sysGain = audioCtx.createGain()
          sysSrc.connect(sysGain).connect(dest)
          audioNodesRef.current = {
            ...(audioNodesRef.current || {}),
            sysSrc,
            sysGain,
          }
        } catch (e) {
          console.log("Could not create system audio source:", e)
        }
      }

      // Mic audio
      if (micStream && micStream.getAudioTracks().length > 0) {
        try {
          const micSrc = audioCtx.createMediaStreamSource(new MediaStream(micStream.getAudioTracks()))
          const micGain = audioCtx.createGain()
          micSrc.connect(micGain).connect(dest)
          audioNodesRef.current = {
            ...(audioNodesRef.current || {}),
            micSrc,
            micGain,
          }
        } catch (e) {
          console.log("Could not create mic audio source:", e)
        }
      }

      const composedStream = new MediaStream([...displayStream.getVideoTracks(), ...dest.stream.getAudioTracks()])

      return { composedStream, displayStream, micStream, audioCtx, nodes: { ...(audioNodesRef.current || {}), dest } }
    },
    [notify],
  )

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => t.stop())
      displayStreamRef.current = null
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close()
      } catch {}
      audioCtxRef.current = null
      audioNodesRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    const rec = mediaRecorderRef.current
    if (!rec) {
      setIsRecording(false)
      setIsPaused(false)
      cleanup()
      return
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (rec.state !== "inactive") {
      try {
        rec.stop()
      } catch {}
    }
    cleanup()
  }, [cleanup])

  const start = useCallback(async () => {
    // idempotent
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      setIsBarVisible(true)
      return
    }
    try {
      await enumerateMics()
      const { composedStream, displayStream, micStream, audioCtx, nodes } =
        await getComposedDisplayAndMicStream(currentMicInput)

      displayStreamRef.current = displayStream
      micStreamRef.current = micStream
      audioCtxRef.current = audioCtx
      audioNodesRef.current = nodes

      const options: MediaRecorderOptions = { mimeType: "video/webm;codecs=vp8,opus" }
      try {
        mediaRecorderRef.current = new MediaRecorder(composedStream, options)
      } catch {
        mediaRecorderRef.current = new MediaRecorder(composedStream)
      }

      chunksRef.current = []
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" })
        const url = window.URL.createObjectURL(blob)
        setPreviewUrl(url)
        setVideoBlob(blob)
        setShowModal(true)
        setIsRecording(false)
        setIsPaused(false)
        setIsMicOn(true)
        setElapsedSeconds(0)
        chunksRef.current = []
      }

      mediaRecorderRef.current.start()

      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)

      if (audioNodesRef.current?.micGain) {
        audioNodesRef.current.micGain.gain.value = isMicOn ? 1 : 0
      }

      setIsRecording(true)
      setIsBarVisible(true)
      console.log("✅ Recording started")
    } catch (err: any) {
      console.error("Failed to start recording:", err)
      notify(err?.message || "Failed to start recording. Check permissions.")
    }
  }, [currentMicInput, enumerateMics, getComposedDisplayAndMicStream, isMicOn, notify])

  const pauseResume = useCallback(() => {
    const rec = mediaRecorderRef.current
    if (!rec) return

    if (isPaused) {
      // resume
      intervalRef.current = window.setInterval(() => setElapsedSeconds((p) => p + 1), 1000)
      try {
        if (audioNodesRef.current?.micGain) {
          audioNodesRef.current.micGain.gain.value = isMicOn ? 1 : 0
        }
        rec.resume()
      } catch (e) {
        console.log("resume failed", e)
      }
      setIsPaused(false)
    } else {
      // pause
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      try {
        rec.pause()
      } catch (e) {
        console.log("pause failed", e)
      }
      setIsPaused(true)
    }
  }, [isPaused, isMicOn])

  const toggleMic = useCallback(() => {
    const newState = !isMicOn
    setIsMicOn(newState)
    if (audioNodesRef.current?.micGain) {
      audioNodesRef.current.micGain.gain.value = newState ? 1 : 0
      console.log(`🎤 micGain set to ${newState ? 1 : 0}`)
    } else if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        if (isMicrophoneTrack(track)) {
          track.enabled = newState
          console.log(`🎤 track ${track.label} enabled=${track.enabled}`)
        }
      })
    } else {
      console.log("⚠️ No microphone stream available for toggling")
    }
  }, [isMicOn])

  const changeMicrophone = useCallback(
    (newDeviceId: string) => {
      if (newDeviceId === currentMicInput) return
      if (!isRecording && !isPaused) {
        setCurrentMicInput(newDeviceId)
      }
      ;(async () => {
        try {
          const newMic = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: newDeviceId } } })
          if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach((t) => t.stop())
          }
          micStreamRef.current = newMic

          if (audioCtxRef.current && audioNodesRef.current) {
            try {
              audioNodesRef.current.micSrc?.disconnect()
            } catch {}
            const newMicSrc = audioCtxRef.current.createMediaStreamSource(newMic)
            audioNodesRef.current.micSrc = newMicSrc
            if (!audioNodesRef.current.micGain) {
              audioNodesRef.current.micGain = audioCtxRef.current.createGain()
              audioNodesRef.current.micGain.connect(audioNodesRef.current.dest)
            }
            newMicSrc.connect(audioNodesRef.current.micGain)
            audioNodesRef.current.micGain.gain.value = isMicOn ? 1 : 0
          }
          setCurrentMicInput(newDeviceId)
          console.log("✅ Microphone switch done")
        } catch (err) {
          console.error("Failed to switch microphone:", err)
          notify("Failed to switch microphone - continuing with current mic")
        }
      })()
    },
    [currentMicInput, isPaused, isRecording, isMicOn, notify],
  )

  const showBar = useCallback(() => {
    setIsBarVisible(true)
    // Refresh devices list when showing the bar
    enumerateMics()
  }, [enumerateMics])

  const hideBar = useCallback(() => {
    setIsBarVisible(false)
  }, [])

  const closeBar = useCallback(() => {
    if (mediaRecorderRef.current?.state !== "inactive") stop()
    setIsBarVisible(false)
  }, [stop])

  // Utility to clear preview and revoke blob url
  const clearPreview = useCallback(() => {
    if (previewUrl) {
      try {
        URL.revokeObjectURL(previewUrl)
      } catch {}
    }
    setPreviewUrl(null)
    setVideoBlob(null)
    setShowModal(false)
  }, [previewUrl])

  // Expose way to set preview from an external Blob (e.g., after login restore)
  const showPreviewFromBlob = useCallback(
    (blob: Blob) => {
      // revoke previous if any
      if (previewUrl) {
        try {
          URL.revokeObjectURL(previewUrl)
        } catch {}
      }
      const url = URL.createObjectURL(blob)
      setVideoBlob(blob)
      setPreviewUrl(url)
      setShowModal(true)
    },
    [previewUrl],
  )

  useEffect(() => {
    let mounted = true
    if (typeof window === "undefined") return
    
    const restorePending = async () => {
      try {
        console.log('🔍 Attempting to restore pending recording...');
        const pending = await loadPendingRecording()
        console.log('📦 Pending recording found:', pending ? 'YES' : 'NO');
        if (!mounted) return
        if (pending?.blob) {
          console.log('🎬 Restoring recording blob, size:', pending.blob.size);
          showPreviewFromBlob(pending.blob)
          // Clear the session flag since we successfully restored
          sessionStorage.removeItem('resumeRecordingAfterLogin');
          // NOTE: Do NOT clearPendingRecording here. We clear after user saves or dismisses the preview.
        }
      } catch (e) {
        console.warn("[RecordingProvider] restore pending failed", e)
      }
    }

    // Initial restore on mount
    restorePending()

    // Listen for custom event to restore pending recording after login
    const handleRestorePendingRecording = () => {
      console.log('🎯 Received restorePendingRecording event');
      restorePending()
    }

    window.addEventListener('restorePendingRecording', handleRestorePendingRecording)

    return () => {
      mounted = false
      window.removeEventListener('restorePendingRecording', handleRestorePendingRecording)
    }
  }, [showPreviewFromBlob])

  // Also check for pending recordings when user logs in
  useEffect(() => {
    if (user) {
      const shouldResumeRecording = sessionStorage.getItem('resumeRecordingAfterLogin');
      console.log('👤 User logged in - shouldResumeRecording:', shouldResumeRecording);
      if (shouldResumeRecording) {
        sessionStorage.removeItem('resumeRecordingAfterLogin');
        console.log('⏰ Scheduling pending recording restoration...');
        // Small delay to ensure user is fully set in context
        setTimeout(async () => {
          try {
            console.log('🔄 Attempting restoration after user login...');
            const pending = await loadPendingRecording()
            console.log('📦 Pending recording after login:', pending ? 'YES' : 'NO');
            if (pending?.blob) {
              console.log('🎬 Restoring recording after login, size:', pending.blob.size);
              showPreviewFromBlob(pending.blob)
              // Clear the session flag since we successfully restored
              sessionStorage.removeItem('resumeRecordingAfterLogin');
            }
          } catch (e) {
            console.warn("[RecordingProvider] restore pending after login failed", e)
          }
        }, 100);
      }
    }
  }, [user, showPreviewFromBlob])

  // Auto-stop at 3 minutes
  useEffect(() => {
    if (isRecording && elapsedSeconds >= 180) {
      stop()
    }
  }, [elapsedSeconds, isRecording, stop])

  // Cleanup on provider unmount (e.g., tab close)
  useEffect(() => {
    return () => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop()
        }
      } catch {}
      cleanup()
      if (previewUrl) {
        try {
          URL.revokeObjectURL(previewUrl)
        } catch {}
      }
    }
  }, [cleanup, previewUrl])

  const registerToast = useCallback((setter: ToastSetter) => {
    toastSetterRef.current = setter
  }, [])

  const navigateToLogin = useCallback(() => {
    navigate("/login", { state: { from: { pathname: "/" } } })
  }, [navigate])

  const value: RecordingContextValue = {
    isBarVisible,
    showBar,
    hideBar,

    isRecording,
    isPaused,
    isMicOn,
    elapsedSeconds,

    audioInputDevices,
    currentMicInput,
    changeMicrophone,
    toggleMic,

    start,
    stop,
    pauseResume,
    closeBar,

    previewUrl,
    videoBlob,
    showModal,
    setShowModal,
    showPreviewFromBlob,
    clearPreview,

    navigateToLogin,

    registerToast,
  }

  return <RecordingContext.Provider value={value}>{children}</RecordingContext.Provider>
}
