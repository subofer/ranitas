"use client"
import Icon from "./Icon"

const Counter = ({especialCounter, item}) => {
  let sumar = () => {throw new Error("Falta configurar especialCounter en Counter")};
  let restar = () => {throw new Error("Falta configurar especialCounter en Counter")};

  const handleWheel = (e) => {
    e.deltaY < 0 && sumar(item);
    e.deltaY > 0 && item.cantidad >1 && restar(item);
  };

  if(especialCounter){
    sumar = especialCounter.sumarProducto
    restar = especialCounter.restarProducto
  }

  const suma = () => sumar(item)
  const resta = () => restar(item)

  return(
    <div className="flex flex-row cursor-ns-resize" onWheel={handleWheel}>
      <Icon icono={"minus"} onClick={resta} className={"text-red-900 cursor-ns-resize"}/>
      <div className="w-[25px] text-center 	">
        <span className="mx-auto text-center" >
          {item.cantidad}
        </span>
      </div>
      <Icon icono={"plus"} onClick={suma} className={"text-lime-500 cursor-ns-resize"}/>
    </div>
  )
}

export default Counter