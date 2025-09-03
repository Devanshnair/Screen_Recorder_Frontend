import { Play, Pause, Mic, MicOff, X, ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { detectBrowserSupport } from '../utils/browserSupport'

type Props = {
  visible: boolean
  setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>
  setToast: React.Dispatch<React.SetStateAction<string | null>>
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>
  setVideoBlob: React.Dispatch<React.SetStateAction<Blob | null>>
  setVisible: React.Dispatch<React.SetStateAction<boolean>>
}

function formatTime(total: number) {
  const mm = String(Math.floor(total / 60)).padStart(2, "0")
  const ss = String(total % 60).padStart(2, "0")
  return `${mm}:${ss}`
}

export function FloatingBar({
  visible,
  setVisible,
  setToast,
  setShowModal,
  setPreviewUrl,
  setVideoBlob,
}: Props) {

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [showMicDropdown, setShowMicDropdown] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([])
  const [currentMicInput, setCurrentMicInput] = useState<string | null>('');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<any>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Helper function to detect microphone tracks
  const isMicrophoneTrack = (track: MediaStreamTrack): boolean => {
    const label = track.label.toLowerCase();
    return label.includes("microphone") || 
           label.includes("headset") || 
           label.includes("communications") ||
           label.includes("mic") ||
           label.includes("audio input");
  };

  const getComposedDisplayAndMicStream = (micDeviceId?: string | null) => {

    return navigator.mediaDevices.getDisplayMedia({ 
          video: true, audio: true, 
        })
        .then(async (displayStream) => {
          console.log("Display stream: ", displayStream);
          
          let micStream: MediaStream | null = null
          // Try to get microphone stream
          if(!navigator?.mediaDevices || !navigator.mediaDevices?.getUserMedia){
            setToast("Microphone access not supported - recording without mic");
          }
          else{
            try {
              micStream = await navigator.mediaDevices.getUserMedia({
                audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true
              });
              console.log("Mic stream: ", micStream);
            } 
            catch (micError) {
              // micStream remains null; caller should handle mixing missing mic
              micStream = null;
              console.log("Mic error: ", micError);
              setToast("Failed to capture microphone - recording without mic");
            }
          }

          // Create Audio context and destination
          const AudioCtx =  (window as any).AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioCtx()
          const dest = audioCtx.createMediaStreamDestination();

          // Connect system audio to dest
          if(displayStream.getAudioTracks().length > 0){
            try{
              const sysSrc = audioCtx.createMediaStreamSource(new MediaStream(displayStream.getAudioTracks()))
              const sysGain = audioCtx.createGain();
              sysSrc.connect(sysGain).connect(dest);
              audioNodesRef.current = {
                ...(audioNodesRef.current || {}),
                sysSrc,
                sysGain
              }
            }
            catch (err) {
              console.log("Could not create sys audio source:", err);
            }
          }

          // Connect mic audio to dest
          let nodes = {}
          if(micStream && (micStream as MediaStream).getAudioTracks().length > 0){
            try{
              const micSrc = audioCtx.createMediaStreamSource(new MediaStream((micStream as MediaStream).getAudioTracks()))
              const micGain = audioCtx.createGain()
              micSrc.connect(micGain).connect(dest);
              audioNodesRef.current = {
                ...(audioNodesRef.current || {}),
                micSrc,
                micGain
              }
              nodes = {
                micSrc,
                micGain
              }
            }
            catch (err) {
              console.log("Could not create mic audio source:", err);
            }
          }

          // make composed stream 
          const composedStream = new MediaStream([
            ...displayStream.getVideoTracks(),
            ...dest.stream.getAudioTracks(),
          ])
          
          return {
            composedStream,
            displayStream,
            micStream,
            audioCtx,
            nodes: { ...nodes, dest }
          }
        })
  }

  const onStop = useCallback(() => {
    if (mediaRecorderRef.current) {

      if(intervalRef.current){
        clearInterval(intervalRef.current)
        intervalRef.current = null;
      }

      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      
      if (micStreamRef.current) {
        console.log('🛑 Stopping microphone stream');
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch (err) {}
        audioCtxRef.current = null;
        audioNodesRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if(elapsedSeconds==180) onStop();
  }, [elapsedSeconds, onStop])

  useEffect(()=> {
    if(visible){
      if(!navigator?.mediaDevices || !navigator.mediaDevices?.enumerateDevices){
          setToast("Media devices not supported in this browser");
      }
      else{
          // Find available audio inputs (microphones) and remove duplicates
          navigator.mediaDevices.enumerateDevices()
          .then((devices) => {
            const audiodevices: MediaDeviceInfo[] = devices.filter(device => device.kind === 'audioinput');
            const processedDevices = audiodevices.map((dev) => {
              let newLabel = dev.label;
              if(newLabel.toLowerCase().includes('default -')) {
                newLabel = newLabel.replace(/default\s*-\s*/i, "").trim();
              }
              if(newLabel.toLowerCase().includes('communications -')) {
                newLabel = newLabel.replace(/communications\s*-\s*/i, "").trim();
              }
              
              return {
                ...dev,
                deviceId: dev.deviceId,
                groupId: dev.groupId,
                kind: dev.kind,
                label: newLabel,
              };
            });
            const noDuplicates = processedDevices.filter((dev, ind, self) => 
              self.findIndex(d => d.label === dev.label) === ind
            )
            setAudioInputDevices(noDuplicates);
            setCurrentMicInput(noDuplicates[0].deviceId)
          })
      }
    }
    return () => setAudioInputDevices([])
  }, [visible])

  if (!visible) return null

  const onStartRecording = () => {
    // Check browser support first
    const support = detectBrowserSupport();
    if (!support.features.supportsScreenRecording) {
        setToast(`${support.recommendations.message} Please use Chrome for best experience.`);
        return;
    }
    
    if(!navigator?.mediaDevices || !navigator.mediaDevices?.getDisplayMedia){
        setToast("Screen capture not supported in this browser. Please use Chrome");
        return;
    }
    
    getComposedDisplayAndMicStream(currentMicInput)
    .then(({ composedStream, displayStream, micStream, audioCtx, nodes }) => {
      
      displayStreamRef.current = displayStream
      micStreamRef.current = micStream
      audioCtxRef.current = audioCtx
      audioNodesRef.current = nodes

      let options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp8,opus' };
      try {
        mediaRecorderRef.current = new MediaRecorder(composedStream, options)
      }
      catch {
        mediaRecorderRef.current = new MediaRecorder(composedStream)
      }

      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if(e.data.size > 0) chunksRef.current.push(e.data);
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm'});
        const url = window.URL.createObjectURL(blob);
        setPreviewUrl(url);
        setVideoBlob(blob);
        setShowModal(true);   
        setIsRecording(false)
        setIsPaused(false)
        setIsMicOn(true)
        setElapsedSeconds(0)
        chunksRef.current = [];     
      };

      mediaRecorderRef.current.start()

      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);

      if (audioNodesRef.current?.micGain) {
        audioNodesRef.current.micGain.gain.value = isMicOn ? 1 : 0;
      }

      setIsRecording(true);
      console.log('✅ Recording started successfully');
    })
    .catch((err) => {
      console.error("Failed to start recording:", err);
      setToast("Failed to start recording. Check permissions.");
    });
  }

  const onToggleMic = () => {
    const newState = !isMicOn
    setIsMicOn(newState)
    if(audioNodesRef.current?.micGain){
      audioNodesRef.current.micGain.gain.value = newState ? 1 : 0;
      console.log(`🎤 micGain set to ${newState ? 1 : 0}`);
    } 
    else if(micStreamRef.current){
      micStreamRef.current.getAudioTracks().forEach((track) => {
         if(isMicrophoneTrack(track)){
          track.enabled = newState;
          console.log(`🎤 track ${track.label} enabled=${track.enabled}`);
        }
      })
    }
    else {
        console.log('⚠️ No microphone stream available for toggling');
    }
  }

  const handleChangeMicrophone = (newDeviceId: string) => {
    if(newDeviceId === currentMicInput) {
        console.log('⏭️ Same microphone selected, no change needed');
        return;
    }
    
    if(!isRecording && !isPaused){
      console.log(`🔄 Updating microphone selection to: ${newDeviceId}`);
      setCurrentMicInput(newDeviceId)
    }
    
    (async () => {
      try {
        const newMic = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: newDeviceId } } });
        console.log("✅ New mic stream obtained:", newMic);

        // stop previous mic stream tracks
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        micStreamRef.current = newMic;

        // rewire audioCtx nodes (keep same dest and micGain, just replace micSrc)
        if (audioCtxRef.current && audioNodesRef.current) {
          try { 
            audioNodesRef.current.micSrc?.disconnect(); 
          } 
          catch (err) {}
          const newMicSrc = audioCtxRef.current.createMediaStreamSource(newMic);
          audioNodesRef.current.micSrc = newMicSrc;

          if (!audioNodesRef.current.micGain) {
            audioNodesRef.current.micGain = audioCtxRef.current.createGain();
            audioNodesRef.current.micGain.connect(audioNodesRef.current.dest);
          }

          newMicSrc.connect(audioNodesRef.current.micGain);
          audioNodesRef.current.micGain.gain.value = isMicOn ? 1 : 0;
        } 
        else {
          console.log("audioCtx / nodes not present when switching mic");
        }

        setCurrentMicInput(newDeviceId);
        console.log('✅ Microphone switch completed successfully (hot-swap)');
      } 
      catch (err) {
        console.error("❌ Failed to switch microphone:", err);
        setToast("Failed to switch microphone - continuing with current mic");
      }
    })();
  }

  const onPauseResume = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if(isPaused){
      // Resume
      // if(intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(()=> setElapsedSeconds(prev => prev + 1), 1000);
      try {
        // reapply mic gain on resume
        if (audioNodesRef.current?.micGain) audioNodesRef.current.micGain.gain.value = isMicOn ? 1 : 0;
        recorder.resume();
      } 
      catch (err) { 
        console.log("resume failed", err) 
      }
      setIsPaused(false);
      console.log('✅ Recording resumed');
    } 
    else {
      // Pause
      if(intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      try { 
        recorder.pause();
      } 
      catch (err) { console.log("pause failed", err) }
      setIsPaused(true);
      console.log('✅ Recording paused');
    }
  }

 
  const onClose = () => {
    if(mediaRecorderRef.current?.state !== 'inactive') onStop();
    setVisible(false);
  }

  return (
    <div className="fixed top-36 right-4 z-50" role="region" aria-label="Recording controls">
      <div className="flex items-center gap-1 rounded-full bg-white shadow-lg border border-gray-200 p-0.25 h-12">
        
        {/* Start/Stop */}
        <div className={`flex justify-center items-center w-11 h-11 rounded-full border-3 transition ${
          isRecording ? 'border-violet-500 hover:border-violet-600' : 'border-orange-600 hover:border-orange-700'
        }`}>
            <button
                type="button"
                onClick={isRecording ? onStop : onStartRecording}
                className={`inline-flex items-center justify-center transition focus:outline-none ${
                  isRecording 
                    ? 'rounded-sm w-5 h-5 bg-violet-500 text-white hover:bg-violet-600' 
                    : 'rounded-full w-8 h-8 bg-orange-600 text-white hover:bg-orange-700'
                }`}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
                title={isRecording ? "Stop" : "Start"}
            >
            </button>
        </div>

        {/* Pause / Resume */}
        {isRecording ? (
          <button
          type="button"
          onClick={onPauseResume}
          className="inline-flex items-center justify-center rounded-full p-2 text-violet-500 focus:outline-none transition"
          aria-label={isPaused ? "Resume recording" : "Pause recording"}
          title={isPaused ? "Resume" : "Pause"}
        >
          {isPaused ? (
            <Play size={18} />
          ) : (
            <Pause size={18} />
          )}
        </button>
        ): (<></>)}

        {/* Mic toggle with dropdown */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={onToggleMic}
            aria-pressed={!isMicOn}
            aria-label={isMicOn ? "Mute microphone" : "Unmute microphone"}
            className="inline-flex items-center justify-center rounded-full p-1 text-slate-500 hover:bg-slate-50 focus:outline-none transition"
            title={isMicOn ? "Mute mic" : "Unmute mic"}
          >
            {isMicOn ? (
              <Mic size={18} />
            ) : (
              <MicOff size={18} />
            )}
          </button>
          
          <button
            type="button"
            onClick={() => setShowMicDropdown(!showMicDropdown)}
            className="inline-flex items-center justify-center rounded-full p-1 text-slate-500 hover:bg-slate-50 focus:outline-none transition -ml-1"
            aria-label="Microphone options"
            title="Microphone options"
          >
            <ChevronDown size={14} />
          </button>
          
          {/* Microphone dropdown */}
          {showMicDropdown && (
            <div className="absolute top-full left-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-2">
                <div className="text-sm font-medium text-gray-700 mb-2">Select Microphone</div>
                <div className="space-y-1">
                  {audioInputDevices?.map((device, ind) => (
                    <button 
                      key={ind}
                      onClick={() => handleChangeMicrophone(device.deviceId)}
                      className={`w-full text-left px-3 py-2 text-sm ${currentMicInput == device.deviceId ? "text-violet-400 bg-violet-100 hover:bg-violet-200" : "text-gray-700 hover:bg-gray-100"}  rounded`}>
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
            className={`inline-block h-2 w-2 rounded-full ${
              isRecording && !isPaused ? 'bg-red-500' : 'bg-gray-400'
            }`} 
            aria-hidden="true" 
          />
          <span className="text-sm text-black">
            {formatTime(elapsedSeconds)} / <span className='text-gray-500'>3:00</span>
          </span>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
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