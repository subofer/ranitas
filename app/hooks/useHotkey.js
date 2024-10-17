import { useEffect, useRef } from 'react';

const useHotkey = (keys, ref = null, handleKeyDown = null, focusRequired = false) => {
  const internalRef = useRef(null);
  const targetRef = ref || internalRef;

  useEffect(() => {
    const internalHandleKeyDown = (event) => {
      const keyCombo = keys.every(key => {
        if (key.toLowerCase() === 'control') return event.ctrlKey;
        if (key.toLowerCase() === 'shift') return event.shiftKey;
        if (key.toLowerCase() === 'alt') return event.altKey;
        return event.key?.toLowerCase() === key.toLowerCase();
      });
      const shouldTrigger = !focusRequired || (focusRequired && document.activeElement === targetRef.current);

      if (keyCombo && shouldTrigger) {
        event.preventDefault();
        if (targetRef && targetRef.current) {
          targetRef.current.focus();
        }
        if (handleKeyDown) {
          handleKeyDown(event);
        }
      }
    };

    document.addEventListener('keydown', internalHandleKeyDown);

    return () => {
      document.removeEventListener('keydown', internalHandleKeyDown);
    };
  }, [keys, targetRef, handleKeyDown, focusRequired]);

  return targetRef;
}; 

export default useHotkey;
