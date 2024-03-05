import { useRef, useState } from "react";

const useFormControl = (action) => {
  const inputErrorClassName = 'bg-red-300'

  const ref = useRef(null)
  const defaultResult = {error: false};
  const [result, setResult] = useState(defaultResult)

  const handleAction = ({meta, ...error} = {}) => {
    if(meta?.target.length > 0) {
      meta.target.forEach(
        (e) => ref.current.elements[e].classList.add(inputErrorClassName)
      );
      setResult(error)
    } else {
      resetForm()
    }
  }

  const resetForm = () => {
    [...ref.current.elements].forEach(
      (e) => e.classList.remove(inputErrorClassName)
    );
    ref.current.reset();
    setResult(defaultResult)
  }

  return({
    result,
    ref,
    onReset: resetForm,
    action: async (formData) => {
      const actionReturn = await action(formData)
      handleAction(actionReturn)
    },
  }
)};

export default useFormControl;