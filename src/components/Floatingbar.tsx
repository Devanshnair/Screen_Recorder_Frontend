"use client"

import { useState } from "react"

import { Play, Pause, Mic, MicOff, X, ChevronDown } from "lucide-react"
import { useRecording } from "../contexts/RecordingContext"

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
      <div className="flex items-center gap-1 rounded-full bg-white shadow-lg border border-gray-200 p-0.25 h-12">
        {/* Start/Stop */}
        <div
          className={`flex justify-center items-center w-11 h-11 rounded-full border-3 transition ${
            isRecording ? "border-violet-500 hover:border-violet-600" : "border-orange-600 hover:border-orange-700"
          }`}
        >
          <button
            type="button"
            onClick={isRecording ? stop : start}
            className={`inline-flex items-center justify-center transition focus:outline-none ${
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
          <button
            type="button"
            onClick={pauseResume}
            className="inline-flex items-center justify-center rounded-full p-2 text-violet-500 focus:outline-none transition"
            aria-label={isPaused ? "Resume recording" : "Pause recording"}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>
        ) : null}

        {/* Mic toggle with dropdown */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={toggleMic}
            aria-pressed={!isMicOn}
            aria-label={isMicOn ? "Mute microphone" : "Unmute microphone"}
            className="inline-flex items-center justify-center rounded-full p-1 text-slate-500 hover:bg-slate-50 focus:outline-none transition"
            title={isMicOn ? "Mute mic" : "Unmute mic"}
          >
            {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
          </button>

          <button
            type="button"
            onClick={() => setShowMicDropdown((v) => !v)}
            className="inline-flex items-center justify-center rounded-full p-1 text-slate-500 hover:bg-slate-50 focus:outline-none transition -ml-1"
            aria-label="Microphone options"
            title="Microphone options"
          >
            <ChevronDown size={14} />
          </button>

          {showMicDropdown && (
            <div className="absolute top-full left-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-2">
                <div className="text-sm font-medium text-gray-700 mb-2">Select Microphone</div>
                <div className="space-y-1">
                  {audioInputDevices?.map((device, ind) => (
                    <button
                      key={ind}
                      onClick={() => changeMicrophone(device.deviceId)}
                      className={`w-full text-left px-3 py-2 text-sm ${
                        currentMicInput == device.deviceId
                          ? "text-violet-400 bg-violet-100 hover:bg-violet-200"
                          : "text-gray-700 hover:bg-gray-100"
                      }  rounded`}
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
          <span className="text-sm text-black">
            {formatTime(elapsedSeconds)} / <span className="text-gray-500">3:00</span>
          </span>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={closeBar}
          className="inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:text-gray-600 focus:outline-none transition ml-1"
          aria-label="Close recording bar"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
