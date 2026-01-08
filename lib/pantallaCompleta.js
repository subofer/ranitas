import { useState, useEffect, useCallback } from 'react';

const useFullScreen = () => {
  const [isFull, setIsFull] = useState(false);

  const toggle = useCallback(() => (
    !isFull
      ? document?.documentElement?.requestFullscreen?.()
      : document?.exitFullscreen?.()
  ), [isFull]);


  useEffect(() => {
    const noSsr = typeof document !== "undefined"
    const handler = () => setIsFull(!!document.fullscreenElement);
    noSsr && document.addEventListener("fullscreenchange", handler);

    setIsFull(!!document.fullscreenElement);

    return () => { if (noSsr) { document.removeEventListener("fullscreenchange", handler) } };
  }, []);

  return {
    isFullScreen: isFull,
    toggleFullScreen: toggle,
  };
};

export default useFullScreen;
