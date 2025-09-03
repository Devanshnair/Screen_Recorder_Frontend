import React, { memo, useEffect, useRef, useState } from 'react';

type LazyVideoProps = {
  src: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playbackRate?: number;
};

const LazyVideoBase: React.FC<LazyVideoProps> = ({
  src,
  className,
  autoPlay = true,
  muted = true,
  loop = true,
  playbackRate = 1,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setCurrentSrc(src);
      return;
    }

    const node = videoRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCurrentSrc(src);
            observer.disconnect();
          }
        });
      },
      { root: null, rootMargin: '0px', threshold: 0.25 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [src]);

  // Try to autoplay when source becomes available
  useEffect(() => {
    const node = videoRef.current;
    if (!node || !currentSrc || !autoPlay) return;
    const tryPlay = () => {
  // Ensure playbackRate is applied before play
  node.playbackRate = playbackRate;
      const p = node.play();
      if (p && typeof p.then === 'function') {
        p.catch(() => {/* ignore autoplay rejection */});
      }
    };
    // If metadata is ready, attempt to play; otherwise wait for it
    if (node.readyState >= 1) {
      tryPlay();
    } else {
      const onLoaded = () => {
        tryPlay();
        node.removeEventListener('loadeddata', onLoaded);
      };
      node.addEventListener('loadeddata', onLoaded);
      return () => node.removeEventListener('loadeddata', onLoaded);
    }
  }, [currentSrc, autoPlay, playbackRate]);

  // Keep playbackRate in sync when prop changes even after load
  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    node.playbackRate = playbackRate;
  }, [playbackRate]);

  return (
    <video
      ref={videoRef}
      src={currentSrc}
      className={className}
  preload="none"
  playsInline
  autoPlay={autoPlay}
  muted={muted}
  loop={loop}
      
    />
  );
};

export const LazyVideo = memo(LazyVideoBase);
