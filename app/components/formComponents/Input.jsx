"use client"
import { forwardRef } from "react";
import Icon from "./Icon";
const Input = forwardRef(({ name, type = "text",value, label, placeholder, className, onChange, forceClassName, actionIcon,  ...props }, ref) => {

  const handleWheel = (e) => {
    if (type === "number") {
      const direction = e.deltaY < 0 ? 1 : -1; // Determina la dirección del scroll
      const newValue = parseFloat(value || 0) + direction;
      const useValue = newValue > 1 ? newValue.toString() : 1;
      onChange({ target: { name, value: useValue } });
    }
  };

  return (
    <div className="relative">
      <input
        ref={ref}
        id={name}
        onChange={onChange}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onWheel={handleWheel}
        className={`
          form-input
          block w-full
          px-2.5 pb-2.5
          pt-4 border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0
          focus:border-slate-400 peer
          text-right
          ${forceClassName? forceClassName : "placeholder:translate-y-2"}
          ${type === "checkbox" ? "form-checkbox text-blue-600 mr-1 ml-auto" : ""}
          ${className}
          ${actionIcon ? "pr-12":""}
          `}
          style={type === "checkbox" ? { marginRight: 0, marginLeft: 'auto' } : {}}

        {...props}
      />
        <label
          htmlFor={name}
          className={`
            absolute left-0 transition-all px-2.5
            text-sm font-medium top-0.5 text-black
            peer-placeholder-shown:text-md peer-placeholder-shown:top-2.5
            peer-focus:text-sm peer-focus:top-0.5`}
        >
          {label}
        </label>
        { actionIcon &&
          <div className="text-[1.4rem] pt-1 absolute right-2 top-[50%] transform -translate-y-1/2">
            {actionIcon}
          </div>
        }

    </div>
  );
})

Input.displayName = "Input"
export default Input;
