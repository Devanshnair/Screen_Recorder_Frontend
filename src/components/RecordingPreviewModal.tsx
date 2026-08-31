"use client"

import { useRecording } from "../contexts/RecordingContext"
import { Modal } from "./Modal"
import { clearPendingRecording } from "../utils/recordingStorage"

export function RecordingPreviewModal() {
  const { showModal, setShowModal, previewUrl, videoBlob, clearPreview } = useRecording()
  if (!showModal) return null

  const handleClose = async () => {
    // Only clear pending recording if we're not in the middle of a login flow
    const resumeFlag = sessionStorage.getItem('resumeRecordingAfterLogin');
    if (!resumeFlag) {
      try {
        await clearPendingRecording()
      } catch {}
    }
    clearPreview()
    setShowModal(false)
  }

  return <Modal open={showModal} onClose={handleClose} videoUrl={previewUrl} videoBlob={videoBlob} />
}
