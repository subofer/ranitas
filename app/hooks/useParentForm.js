import { useEffect, useRef, useState } from "react";

const useParentForm = () => {
  const [reset, setReset] = useState();
  const refPadre = useRef(null);

  const resetInput = (e) => {
    if(e.type == "reset"){
      setReset(prev => !prev)
    }
  }
  
  const submiting = (e) => {
    console.log("submit", e)
  }

  const generalEvent = (e) => {
    console.log("submit", e)
  }
  useEffect(() => {
    const form = refPadre.current.closest('form');
    if(form) {
      form.addEventListener('reset', resetInput);
      form.addEventListener('change', generalEvent);

      return () => {
        form.removeEventListener('reset', resetInput)
        form.removeEventListener('change', generalEvent)
      }

    }
  }, []);

  return{
    refPadre,
    reset,
  }
}


export default useParentForm;