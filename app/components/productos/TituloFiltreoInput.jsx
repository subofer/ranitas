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
    <div className="flex flex-row justify-between px-3 py-2">
      <div className="self-left"> {children} </div>
      <span className="self-center">
        {titulo}
      </span>
      <Input
        name={"InputFiltrero"}
        ref={inputRef}
        type="text"
        className={"mt-1 h-[35px]"}
        placeholder="Filtrar..."
        label={variableLabel}
        onChange={(e) => seter(e.target.value)}
        />
    </div>
  )
}
export default TituloFiltrero