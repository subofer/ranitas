"use client"
import { useKeyDown } from "@/app/hooks/useKeyDown";
import { useEffect } from "react";

const SelectAllToggle = ({children, seter}) => {

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault();
        seter();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [seter]);

  return(
    <button onClick={seter}
      className={`
        px-1
        w-[155px]
        text-nowrap
        text-center
        drop-shadow-xl
        active:scale-95
        active:drop-shadow
        transition duration-150 ease-in-out
        ring-2
        ring-slate-300
        disabled:bg-slate-400
        disabled:cursor-not-allowed
      `}
    >
      {children}
    </button>
  )
}
export default SelectAllToggle
