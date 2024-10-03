"use client"
import { useCallback, useEffect, useState } from "react";
import Input from "../formComponents/Input";
import useMyParams from "@/app/hooks/useMyParams";
import useHotkey from "@/app/hooks/useHotkey";

const TituloFiltrero = ({cantidades, titulo, seter, children}) => {
  const { param, setParam } = useMyParams('filtroListado')
  const [ valorLocal, setValorLocal ] = useState(param)
  const inputRef = useHotkey(['control', 'f'])

  const handleChange = useCallback(({value}) => {
    setParam(value)
    seter(value);
    setValorLocal(value || "");
  },[setParam, seter])

  useEffect(() => {
    seter(param)
  },[seter, param])

  useHotkey(['control', 'q'], inputRef, handleChange)

  useHotkey(['Escape'], inputRef, () => {
    if (document.activeElement === inputRef.current) {
      handleChange({value:undefined})
      inputRef?.current?.blur?.();
    }
  })


  const variableLabel = cantidades.seleccionados != cantidades.total ? `(${cantidades.seleccionados}/${cantidades.total})` : `(${cantidades.total})`
  return(
    <div className="flex flex-row justify-between px-3 py-2">
      <span className="self-left my-auto">{ children }</span>
      <span className="self-center">{ titulo }</span>
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
