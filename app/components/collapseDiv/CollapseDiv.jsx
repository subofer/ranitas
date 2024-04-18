"use client"

import { useState } from "react";
import Icon from "../formComponents/Icon";

export const CollapseDiv = ({
  children,
  initialState = true,
  altura = {open:"h-full", close:"h-64"},
  ancho = {open:"max-w-screen", close:"w-64"},
  ...props
}) => {

  const [hopen, setHOpen] = useState(initialState);
  const [wopen, setWOpen] = useState(initialState);

  const alturas = hopen ? altura.open : altura.close
  const anchuras = wopen ? ancho.open : ancho.close

  const handleHOpen = () => setHOpen(prev => !prev)
  const handleWOpen = () => setWOpen(prev => !prev)

  return (
    <div className="">
      <div className={`transition-all duration-500  ${alturas} ${anchuras}`}>
      <div className="flex flex-row justify-between">
        <Icon onClick={handleHOpen} className={"self-start"} icono={"chevron-up"} rotate={hopen}/>
        <Icon onClick={handleWOpen} className={"self-end"} icono={"chevron-right"} rotate={wopen}/>
      </div>
        {children}
      </div>
    </div>
  )
};



