import { CloudCheck, Download } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Base_Url } from "../App"
import { validateRecording, generateDefaultFilename } from "../utils/validation"
import { useAuth } from "../contexts/AuthContext"
import { savePendingRecording } from "../utils/recordingStorage"

type Props = {
  open: boolean
  onClose: () => void
  videoUrl: string | null
  videoBlob: Blob | null
}

export function Modal({ open, onClose, videoUrl, videoBlob }: Props) {

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSave = async () => {
    if (!videoBlob || !fileName.trim()) {
      setUploadStatus('error');
      return;
    }

    // Check if user is logged in
    if (!user) {
      await savePendingRecording({ blob: videoBlob, filename: fileName });
      sessionStorage.setItem('resumeRecordingAfterLogin', '1');
      navigate('/login', { state: { from: { pathname: '/' } } });
      return;
    }
    
    // Validate recording before upload
    const validation = validateRecording(videoBlob, 0); // Duration check will be added later
    if (!validation.isValid) {
      console.error('Validation failed:', validation.errors);
      setUploadStatus('error');
      return;
    }
    
    setIsUploading(true);
    setUploadStatus('idle');
    
    try {
      const formData = new FormData();
      formData.append('recording', videoBlob, `${fileName}.webm`);
      formData.append('title', fileName);
      formData.append('size', videoBlob.size.toString());

      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${Base_Url}/api/recordings`, {
        method: "POST",
        body: formData,
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          "ngrok-skip-browser-warning": "true",
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Upload successful:', result);
        setUploadStatus('success');
        setTimeout(() => {
          onClose();
          setUploadStatus('idle');
          // Optionally trigger a refresh of recordings list
          window.dispatchEvent(new CustomEvent('refreshRecordings'));
        }, 1500);
      } else {
        const errorData = await response.text();
        console.error('Upload failed:', errorData);
        throw new Error(`Upload failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  }

  // Initialize filename when modal opens
  useEffect(() => {
    if (open) {
      const defaultName = generateDefaultFilename();
      setFileName(defaultName);
    }
  }, [open]);

  // Generate preview image from video
  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.load();
      
      const video = videoRef.current;
      const handleLoadedData = () => {
        // Create canvas to capture frame
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Seek to 1 second or 10% of video duration for preview
          video.currentTime = Math.min(1, video.duration * 0.1);
          
          const handleSeeked = () => {
            ctx.drawImage(video, 0, 0);
            const previewDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setPreviewImage(previewDataUrl);
            video.removeEventListener('seeked', handleSeeked);
          };
          
          video.addEventListener('seeked', handleSeeked);
        }
      };
      
      video.addEventListener('loadeddata', handleLoadedData);
      
      return () => {
        video.removeEventListener('loadeddata', handleLoadedData);
      };
    }
  }, [videoUrl]);

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Recording preview"
    >
      {/* Backdrop */}
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/50" />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-violet-600/30">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Preview & Export</h2>
            <p className="text-sm text-slate-600 mt-1">Review your recording and customize the filename</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-colors"
            aria-label="Close preview"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Filename Input */}
          <div className="mb-6">
            <label htmlFor="filename" className="block text-sm font-medium text-slate-700 mb-2">
              Filename
            </label>
            <div className="relative">
              <input
                id="filename"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-violet-400 focus:border-transparent focus:outline-none focus:shadow-sm focus:shadow-violet-300  transition-shadow text-sm"
                placeholder="Enter filename..."
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
                .webm
              </span>
            </div>
          </div>

          {/* Video Preview */}
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 shadow-inner bg-gray-50">
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-600 text-sm">Your recording preview will appear here</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <a
              href={videoUrl || undefined}
              download={videoUrl && fileName ? `${fileName}.webm` : undefined}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2 transition-colors shadow-sm"
            >
              <Download className="w-5 h-5"/>
              Download
            </a>
            <button
              onClick={handleSave}
              disabled={isUploading || !fileName.trim()}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors shadow-sm ${
                uploadStatus === 'success' 
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-600' 
                  : uploadStatus === 'error'
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
                  : isUploading
                  ? 'bg-orange-400 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-600'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : uploadStatus === 'success' ? (
                <>
                  <CloudCheck className="w-5 h-5"/>
                  Uploaded!
                </>
              ) : uploadStatus === 'error' ? (
                <>
                  <CloudCheck className="w-5 h-5"/>
                  Try Again
                </>
              ) : (
                <>
                  <CloudCheck className="w-5.5 h-5.5"/>
                  Save to Cloud
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
