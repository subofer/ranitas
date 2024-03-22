"use client"
import { useEffect, useRef } from "react";

const TituloFiltrero = ({titulo, seter, children}) => {
  const inputRef = useRef();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === 'f') {
        event.stopPropagation();
        event.preventDefault();
        inputRef.current && inputRef.current.focus();
      }
      if (event.ctrlKey && event.key === 'q') {
        event.stopPropagation();
        event.preventDefault();
        seter('');
      }
      if (event.key === 'Escape' && document.activeElement === inputRef.current) {
        event.preventDefault();
        seter('');
        inputRef.current.value = "";
        inputRef.current.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [seter]);

  return(
    <span className="flex flex-row align-middle justify-center gap-2">
      <span className="self-center">
        {titulo}:
      </span>
    <input
      ref={inputRef}
      type="text"
      placeholder="Filtrar..."
      onChange={(e) => seter(e.target.value)}
      className="input border my-1 self-center border-gray-400 rounded-xl"
      />
      {children}
    </span>
  )
}
export default TituloFiltrero