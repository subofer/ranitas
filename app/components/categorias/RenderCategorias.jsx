import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../formComponents/Icon";

const RenderCategorias = ({item: { categorias }}) => {
  const divRef = useRef(null)
  const [isOverflow, setIsOverflow] = useState(null)

  useEffect(() => {
    if(divRef?.current){
      setIsOverflow(divRef.current.scrollHeight > divRef.current.clientHeight)
    }
  },[categorias])

  return(
    <div className="flex flex-col overflow-show max-h-[4rem]">
      {isOverflow && <Icon className={"text-xs -my-2 -mb-1 pointer-events-none"} icono={"chevron-up"} size={12}/>}
      <div ref={divRef} className="flex flex-col overflow-scroll hideScroll snap-y snap-proximity">
        {categorias.map(({nombre}, index) =>
          <span key={index} className="snap-center">{nombre}</span>
        )}
      </div>
      {isOverflow && <Icon className={"text-xs -my-2 -mt-1 pointer-events-none"} icono={"chevron-down"} size={12}/>}
    </div>
  )
}

export default RenderCategorias;