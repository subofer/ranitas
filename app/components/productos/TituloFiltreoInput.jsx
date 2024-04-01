"use client"
import { useEffect, useRef } from "react";
import Input from "../formComponents/Input";

const TituloFiltrero = ({cantidades, titulo, seter, children}) => {
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

  const variableLabel = cantidades.seleccionados != cantidades.total ? `(${cantidades.seleccionados}/${cantidades.total})` : `(${cantidades.total})`
  return(
    <div className="flex flex-row align-middle justify-center gap-2 bg-transparent">
      <span className="self-center">
        {titulo}:
      </span>
    <Input
      name={"InputFiltrero"}
      ref={inputRef}
      type="text"
      placeholder="Filtrar..."
      label={variableLabel}
      onChange={(e) => seter(e.target.value)}
      />
      {children}
    </div>
  )
}
export default TituloFiltrero