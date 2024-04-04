import { useEffect } from "react";

export const useKeyDown = (handleKeyDown) => {
  useEffect(() => {
    window.removeEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}