import { useRef, useEffect } from 'react';
import logger from '@/lib/logger'

function useRenderCount(nombre) {
  const renderCount = useRef(1); // Comienza desde 1 porque cuenta la primera renderización

  useEffect(() => {
    renderCount.current++;
    logger.debug(`${nombre} Renderizado #${renderCount.current}`, '[useRenderCount]');
  });

  return renderCount.current;
}

export default useRenderCount;