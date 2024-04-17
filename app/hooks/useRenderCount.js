import { useRef, useEffect } from 'react';

function useRenderCount(nombre) {
  const renderCount = useRef(1); // Comienza desde 1 porque cuenta la primera renderización

  useEffect(() => {
    renderCount.current++;
    console.log(nombre, ` Renderizado #${renderCount.current}`);
  });

  return renderCount.current;
}

export default useRenderCount;