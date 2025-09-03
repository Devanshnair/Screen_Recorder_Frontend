// Browser support detection utilities

export const detectBrowserSupport = () => {
  const userAgent = navigator.userAgent;
  const isChrome = userAgent.includes('Chrome') && !userAgent.includes('Edg');
  const isEdge = userAgent.includes('Edg');
  const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
  const isFirefox = userAgent.includes('Firefox');

  const hasGetDisplayMedia = !!navigator.mediaDevices?.getDisplayMedia;
  const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
  const hasMediaRecorder = !!window.MediaRecorder;

  return {
    browser: {
      isChrome,
      isEdge,
      isSafari,
      isFirefox,
      name: isChrome ? 'Chrome' : isEdge ? 'Edge' : isSafari ? 'Safari' : isFirefox ? 'Firefox' : 'Unknown'
    },
    features: {
      hasGetDisplayMedia,
      hasGetUserMedia,
      hasMediaRecorder,
      supportsScreenRecording: hasGetDisplayMedia && hasMediaRecorder
    },
    recommendations: {
      shouldUseChrome: !isChrome && !isEdge,
      canRecord: hasGetDisplayMedia && hasMediaRecorder,
      message: getRecommendationMessage(isChrome, isEdge, isSafari, hasGetDisplayMedia, hasMediaRecorder)
    }
  };
};

const getRecommendationMessage = (
  isChrome: boolean, 
  isEdge: boolean, 
  isSafari: boolean, 
  hasGetDisplayMedia: boolean, 
  hasMediaRecorder: boolean
): string => {
  if (isChrome || isEdge) {
    return hasGetDisplayMedia && hasMediaRecorder 
      ? "Your browser fully supports screen recording!"
      : "Some recording features may not be available.";
  }
  
  if (isSafari) {
    return hasGetDisplayMedia 
      ? "Safari has limited screen recording support. For best experience, use Chrome."
      : "Safari doesn't support screen recording. Please use Chrome for full functionality.";
  }
  
  return "For the best experience, please use Chrome or Edge browsers.";
};

export const getBrowserWarning = () => {
  const support = detectBrowserSupport();
  
  if (!support.features.supportsScreenRecording) {
    return {
      type: 'error' as const,
      title: 'Browser Not Supported',
      message: support.recommendations.message,
      showChromeLink: true
    };
  }
  
  if (support.recommendations.shouldUseChrome) {
    return {
      type: 'warning' as const,
      title: 'Limited Support',
      message: support.recommendations.message,
      showChromeLink: true
    };
  }
  
  return null;
};
