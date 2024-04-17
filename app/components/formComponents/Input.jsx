"use client"
import { forwardRef, useRef } from "react";
import { useFormStatus } from "react-dom";

const Input = forwardRef(({ transform, name, type = "text",value, label, placeholder, className, onChange, forceClassName, actionIcon,  ...props }, ref) => {
  const handleOnChange = (e) => {
    onChange({name: e.target.name, value: e.target.value})
  }
  const { pending } = useFormStatus();

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  const handleWheel = (e) => {
    if (type === "number") {
      const direction = e.deltaY < 0 ? 1 : -1; // Determina la dirección del scroll
      const newValue = parseFloat(value || 0) + direction;
      const useValue = newValue > 1 ? newValue.toString() : 1;
      handleOnChange({ name, value: useValue });
    }
  };
  return (
    <div className="relative w-full">

      <input
        ref={ref}
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={handleOnChange}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        className={`
          appearance-none
          text-right
          block w-full
          px-2 pb-[3px] pt-[20px]
          border-0 border-b-2 border-gray-300
          focus:outline-none focus:ring-0
          focus:border-slate-400 peer

          ${pending ? "bg-gray-200":""}
          ${forceClassName? forceClassName : "placeholder:translate-y-[2px]"}
          ${type === "checkbox" ? "form-checkbox text-blue-600 mr-1 ml-auto" : ""}
          ${actionIcon ? "pr-[32px]":""}
          ${className}
          `}
          style={type === "checkbox" ? { marginRight: 0, marginLeft: 'auto' } : {}}

        {...props}
      />
        <label htmlFor={name}
          className={`
            appearance-none absolute px-2 transition-all top-0.5
            text-[0.96rem] font-medium text-black
            peer-placeholder-shown:text-md
            peer-placeholder-shown:top-1.5
            peer-focus:text-sm
            peer-focus:top-0.5
            peer-focus:px-1.5
          `}
        >
          {label}
        </label>
        { actionIcon &&
          <div className={`
            absolute
            text-center text-[1.2rem]
            w-[1.2rem] right-1 top-[50%]
            pt-1 transform -translate-y-1/2
          `}>
            {actionIcon}
          </div>
        }

    </div>
  );
})

Input.displayName = "Input"
export default Input;
