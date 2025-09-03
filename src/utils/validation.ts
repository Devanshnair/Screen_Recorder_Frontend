// Validation utilities for recordings

export const validateRecording = (blob: Blob, duration: number) => {
  const maxFileSize = 100 * 1024 * 1024 // 100MB
  const maxDuration = 180

  const errors: string[] = []

  if (blob.size > maxFileSize) {
    errors.push(
      `File size (${formatFileSize(blob.size)}) exceeds maximum allowed size (${formatFileSize(maxFileSize)})`,
    )
  }

  if (duration > maxDuration) {
    errors.push(
      `Duration (${formatDuration(duration)}) exceeds maximum allowed duration (${formatDuration(maxDuration)})`,
    )
  }

  if (blob.size < 1000) {
    // Less than 1KB
    errors.push("Recording file is too small. Please try recording again.")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const generateDefaultFilename = (): string => {
  const now = new Date()
  const date = now.toLocaleDateString("en-GB").replace(/\//g, "-")
  const time = now.toLocaleTimeString("en-GB", { hour12: false }).replace(/:/g, "-")
  return `Screen_Recording_${date}_${time}`
}
