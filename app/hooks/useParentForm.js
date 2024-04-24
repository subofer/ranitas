import { useEffect, useRef, useState } from "react";

const useParentForm = () => {
  const [reset, setReset] = useState();
  const refPadre = useRef(null);

  const resetInput = (e) => {
    console.log(e)
    if(e.type == "reset"){
      setReset(prev => !prev)
    }
  }

  useEffect(() => {
    const form = refPadre.current.closest('form');
    if(form) {
      form.addEventListener('reset', resetInput);
      return () => form.removeEventListener('reset', resetInput);
    }
  }, []);

  return{
    refPadre,
    reset,
  }
}


export default useParentForm;