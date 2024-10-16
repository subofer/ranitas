import { useState, useRef, useId, useEffect } from "react";
import useParentForm from "@/app/hooks/useParentForm";
import { useFormStatus } from "react-dom";
import useHotkey from "@/app/hooks/useHotkey";  // Asegúrate de importar el hook correctamente

const Switch = ({ name, value, label, seconLabel, onChange }) => {
  const id = useId();
  const { refPadre, reset } = useParentForm();
  const { pending, action } = useFormStatus();
  const inputRef = useRef(null);
  const [touched, setTouched] = useState(false);

  const handleOnClick = () => {
    inputRef.current.checked = !inputRef.current.checked;
    onChange?.({ name, value: inputRef.current.checked, type: "checkbox" });
  };

  //useHotkey([' '], refPadre, handleOnClick, true);
  useHotkey(['Enter'], refPadre, handleOnClick);
  useHotkey(['ArrowRight'], refPadre, handleOnClick);
  useHotkey(['ArrowLeft'], refPadre, handleOnClick);

  useEffect(() => {
    setTouched(false);
  }, [reset]);

  return (
    <div
      ref={refPadre}
      onClick={() => setTouched(true)}

      className={`flex relative flex-row form-input justify-between
        transition-all duration-500 ease-in-out
        w-full min-h-[2.5rem] px-2
        border-0 border-b-2 border-gray-300
        appearance-none
        hover:border-slate-400
        focus:outline-none focus:ring-2 focus:ring-blue-500
        ${pending ? "bg-gray-200" : ""}
       `}
    >
      <label htmlFor={id}
        className={`
        appearance-none transition-all duration-500 ease-in-out text-[0.96rem] text-md font-medium text-black
        ${touched ? `
        text-sm
          top-0
          px-0
          ` : ""}
          `}>
        <input id={id} alt="autocomplete" className={`hidden`} name={name} value={value} ref={inputRef} type="checkbox" />
        {label}
      </label>
      <div onClick={handleOnClick} className="relative">
        <div className={`
                transition-all duration-300 ease-in-out
                  delay-200
                  h-[2rem] w-[4rem] rounded-full
                  ring-1
                  ring-inset
                  ${value ? 'bg-green-300 ring-green-400' : 'bg-blue-200 ring-blue-300'}
                  focus:ring-2 focus:ring-white focus:ring-opacity-50
              `}
        >
          <div
            tabIndex={0}
            onFocus={() => setTouched(true)}
            className={`
              flex h-full w-1/2
              rounded-full
              bg-slate-500
              ring-1
              ring-inset
              ${value ? 'ring-green-400' : 'ring-blue-300'}
              transition-transform duration-300 ease-in-out
              transform ${value ? 'translate-x-full' : 'translate-x-0'}
              focus:outline-none focus:ring-1
              ${value ? 'focus:ring-green-500' : 'focus:ring-blue-400'}
            `}
          >
          </div>
        </div>
      </div>
      {seconLabel &&
        <label htmlFor={id}
          className={`
            appearance-none transition-all duration-500 ease-in-out text-[0.96rem] text-md font-medium text-black
            ${touched ? `
            text-sm
            top-0
            px-0
            ` : ""}
      `}>
          <input id={id} alt="autocomplete" className={`hidden`} name={name} value={value} ref={inputRef} type="checkbox" />
          {seconLabel}
        </label>
      }
    </div>
  );
}

export default Switch;
