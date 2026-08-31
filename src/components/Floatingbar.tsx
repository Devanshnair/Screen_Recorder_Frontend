"use client"

import { useState } from "react"
import { Play, Pause, Mic, MicOff, X, ChevronDown } from "lucide-react"
import { useRecording } from "../contexts/RecordingContext"
import { Button } from "@/components/ui/button"

function formatTime(total: number) {
  const mm = String(Math.floor(total / 60)).padStart(2, "0")
  const ss = String(total % 60).padStart(2, "0")
  return `${mm}:${ss}`
}

export function FloatingBar() {
  const {
    isBarVisible,
    isRecording,
    isPaused,
    isMicOn,
    elapsedSeconds,
    audioInputDevices,
    currentMicInput,
    start,
    stop,
    pauseResume,
    toggleMic,
    changeMicrophone,
    closeBar,
  } = useRecording()

  const [showMicDropdown, setShowMicDropdown] = useState(false)

  if (!isBarVisible) return null

  return (
    <div className="fixed top-36 right-4 z-50" role="region" aria-label="Recording controls">
      <div className="flex items-center gap-1 rounded-full bg-white dark:bg-slate-900 shadow-lg border border-gray-200 dark:border-slate-800 p-0.5 h-12">
        {/* Start/Stop */}
        <div
          className={`flex justify-center items-center w-11 h-11 rounded-full border-3 transition ${
            isRecording ? "border-violet-500 hover:border-violet-600" : "border-orange-600 hover:border-orange-700"
          }`}
        >
          <button
            type="button"
            onClick={isRecording ? stop : start}
            className={`inline-flex items-center justify-center transition focus:outline-none cursor-pointer ${
              isRecording
                ? "rounded-sm w-5 h-5 bg-violet-500 text-white hover:bg-violet-600"
                : "rounded-full w-8 h-8 bg-orange-600 text-white hover:bg-orange-700"
            }`}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            title={isRecording ? "Stop" : "Start"}
          />
        </div>

        {/* Pause / Resume */}
        {isRecording ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={pauseResume}
            className="text-violet-500 hover:bg-slate-100 dark:hover:bg-slate-800 h-8 w-8"
            aria-label={isPaused ? "Resume recording" : "Pause recording"}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </Button>
        ) : null}

        {/* Mic toggle with dropdown */}
        <div className="relative flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleMic}
            aria-pressed={!isMicOn}
            aria-label={isMicOn ? "Mute microphone" : "Unmute microphone"}
            className="text-slate-500 dark:text-slate-400 h-8 w-8"
            title={isMicOn ? "Mute mic" : "Unmute mic"}
          >
            {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowMicDropdown((v) => !v)}
            className="text-slate-500 dark:text-slate-400 h-6 w-6 -ml-1"
            aria-label="Microphone options"
            title="Microphone options"
          >
            <ChevronDown size={14} />
          </Button>

          {showMicDropdown && (
            <div className="absolute top-full left-0 mt-2 w-44 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-lg z-50">
              <div className="p-2">
                <div className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Select Microphone</div>
                <div className="space-y-1">
                  {audioInputDevices?.map((device, ind) => (
                    <button
                      key={ind}
                      onClick={() => changeMicrophone(device.deviceId)}
                      className={`w-full text-left px-3 py-2 text-sm cursor-pointer rounded transition-colors ${
                        currentMicInput === device.deviceId
                          ? "text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/60 hover:bg-violet-200 dark:hover:bg-violet-950"
                          : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {device.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recording Status Indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${isRecording && !isPaused ? "bg-red-500" : "bg-gray-400"}`}
            aria-hidden="true"
          />
          <span className="text-sm text-black dark:text-slate-200">
            {formatTime(elapsedSeconds)} / <span className="text-gray-500 dark:text-slate-400">3:00</span>
          </span>
        </div>

        {/* Close button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={closeBar}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 ml-1 h-7 w-7"
          aria-label="Close recording bar"
          title="Close"
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  )
}
