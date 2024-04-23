import { useState, useRef, useEffect } from "react"
import { useFormStatus } from "react-dom";


const Switch = ({name, value, label, onChange}) => {
  const { pending } = useFormStatus();
  const inputRef = useRef(null)
  const [activo, setActivo] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if(value){
      setTouched(true)
      setActivo(value)
    }
  },[value])

  const handleOnClick = () => {
    setActivo(prev => !prev)
    setTouched(true)
    inputRef.current.checked = !activo;
    const value = inputRef.current.checked? true : false;
    onChange?.({name, value})
  }

  return(
    <div
      className={`flex relative flex-row form-input justify-between
        transition-all duration-500 ease-in-out
        w-full min-h-[2.5rem] px-2
        border-0 border-b-2 border-gray-300
        appearance-none
        hover:border-slate-400
        ${pending ? "bg-gray-200":""}
       `}
    >
      <label htmlFor={name} 
        className={`
        appearance-none transition-all duration-500 ease-in-out text-[0.96rem] text-md font-medium text-black
        ${touched ? `
        text-sm
          top-0
          px-0
          `:""}
          `}>
          <input className={`hidden`} name={name} ref={inputRef} type="checkbox" />
          {label}
      </label>
    <div onClick={handleOnClick} className="relative">
      <div className={`transition-all duration-300 ease-in-out
      delay-200
      h-[2rem] w-[4rem] rounded-full
      ring-1
      ring-inset
      ${activo ? 'bg-green-300 ring-green-400' : 'bg-blue-200 ring-blue-300'}
      `}
      >
        <div className={`
            flex h-full w-1/2
            rounded-full
            bg-slate-500
            ring-1
            ring-inset
            ${activo ? 'ring-green-400' : 'ring-blue-300'}
            transition-transform duration-300 ease-in-out
            transform ${activo ?'translate-x-full': 'translate-x-0'}
          `}

          >
        </div>
      </div>
    </div>
          </div>
  )
}

export default Switch