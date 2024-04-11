"use client"
import React, { useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Icon from "./Icon";

const Counter = ({ especialCounter, item, valueKey = "cantidad" }) => {
  const MySwal = withReactContent(Swal);

  let sumar = () => { throw new Error("Falta configurar especialCounter en Counter"); };
  let restar = () => { throw new Error("Falta configurar especialCounter en Counter"); };
  let setear = () => { throw new Error("Falta configurar especialCounter en Counter"); };

  if (especialCounter) {
    sumar = especialCounter.sumarProducto;
    restar = especialCounter.restarProducto;
    setear = especialCounter.setearCantidadProducto
  }

  const handleWheel = (e) => {
    if (especialCounter) {
      e.deltaY < 0 && sumar(item);
      e.deltaY > 0 && item[valueKey] > 1 && restar(item);
    }
  };

  const handleSetCantidad = () => {
    MySwal.fire({
      title: 'Ingrese la cantidad',
      input: 'number',
      inputValue: item[valueKey],
      inputAttributes: {
        min: 0,
        step: 1
      },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'Debe ingresar un número!'
        }
        if (value < 0) {
          return 'El número debe ser positivo!';
        }
      }
    }).then((result) => {
      if (result.isConfirmed && result.value >= 0) {
        const newCount = parseInt(result.value, 10);
        setear(item, newCount)
      }
    });
  };

  return (
    <div className={`flex flex-row ${especialCounter ? "cursor-ns-resize" : "cursor-default"}`} onWheel={handleWheel}>
      {especialCounter && <Icon icono={"minus"} onClick={() => restar(item)} className={"text-red-900 cursor-pointer"} />}
      <div className="w-[25px] text-center">
        <span className="mx-auto text-center cursor-pointer" onClick={handleSetCantidad}>
          {item[valueKey]}
        </span>
      </div>
      {especialCounter && <Icon icono={"plus"} onClick={() => sumar(item)} className={"text-lime-500 cursor-pointer"} />}
    </div>
  );
};

export default Counter;

/*
import Icon from "./Icon"

const Counter = ({especialCounter, item, valueKey = "cantidad"}) => {

  let sumar = () => {throw new Error("Falta configurar especialCounter en Counter")};
  let restar = () => {throw new Error("Falta configurar especialCounter en Counter")};

  const handleWheel = (e) => {
    if(especialCounter){
      e.deltaY < 0 && sumar(item);
      e.deltaY > 0 && item[valueKey] >1 && restar(item);
    }
  };

  if(especialCounter){
    sumar = especialCounter.sumarProducto
    restar = especialCounter.restarProducto
  }

  const suma = () => sumar(item)
  const resta = () => restar(item)

  return(
    <div className={`flex flex-row ${especialCounter?"cursor-ns-resize":"cursor-default"}`} onWheel={handleWheel}>
      {!!especialCounter && <Icon icono={"minus"} onClick={resta} className={"text-red-900 cursor-s-resize"}/>}
      <div className="w-[25px] text-center 	">
        <span className="mx-auto text-center" >
          {item[valueKey]}
        </span>
      </div>
      {!!especialCounter && <Icon icono={"plus"} onClick={suma} className={"text-lime-500 cursor-n-resize"}/>}
    </div>
  )
}

export default Counter
*/