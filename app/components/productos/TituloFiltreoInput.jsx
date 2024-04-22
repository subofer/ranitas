"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import Input from "../formComponents/Input";

import useMyParams from "@/app/hooks/useMyParams";

const TituloFiltrero = ({cantidades, titulo, seter, children}) => {
  const { param, setParam } = useMyParams('filtroListado')
  const [ valorLocal, setValorLocal ] = useState(param)
  const inputRef = useRef(null);

  const evita = (e) => {
    e.preventDefault();
    e.stopPropagation();
  }

  const handleChange = useCallback(({value}) => {
    setParam(value)
    seter(value);
    setValorLocal(value);
  },[setParam, seter])

  useEffect(() => {
    seter(param)
  },[seter, param])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'f') {
        evita(e);
        inputRef?.current && inputRef?.current?.focus?.();
      }
      if (e.ctrlKey && e.key === 'q') {
        handleChange({value:""})
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        handleChange({value:undefined})
        setValorLocal("");
        inputRef?.current?.blur?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleChange, seter]);

  const variableLabel = cantidades.seleccionados != cantidades.total ? `(${cantidades.seleccionados}/${cantidades.total})` : `(${cantidades.total})`
  return(
    <div className="flex flex-row justify-between px-3 py-2">
      <div className="self-left"> {children} </div>
      <span className="self-center">
        {titulo}
      </span>
      <div className="">
        <Input
          name={"InputFiltrero"}
          ref={inputRef}
          type="text"
          className={"mt-1 h-[2.35rem]"}
          forceClassName={"placeholder:-translate-y-1 placeholder:mr-2 pb-2"}
          placeholder={"Filtrar..."}
          label={variableLabel}
          onChange={handleChange}
          value={valorLocal}
          />
        </div>
    </div>
  )
}
export default TituloFiltrero
