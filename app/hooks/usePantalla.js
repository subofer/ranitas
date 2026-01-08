import { useCallback, useEffect } from "react";

const usePantalla = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  const handleResize = useCallback(() => {
    setWindowWidth(window.innerWidth);
    setWindowHeight(window.innerHeight);
  },[]);

   useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]); 

  return{
    width: windowWidth,
    height: windowHeight,
    windowWidth,
    windowHeight,
  }


}

export default usePantalla