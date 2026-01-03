"use client"
import { forwardRef } from "react";
import { useFormStatus } from "react-dom";

const Input = forwardRef(({
  transform,
  name = "$ACTION_IGNORE",
  type = "text",
  value,
  label,
  placeholder,
  className,
  onChange,
  forceClassName,
  actionIcon,
  doOnEnter,
  error,
  loading,
  ...props
}, ref) => {
  const { pending } = useFormStatus();

  const handleOnChange = ({ target: { name, value } } = {}) => {
   const newValue = type === "checkbox" ? (value === "on" ? true : false) : value
   const isFormula = typeof value === 'string' && value?.startsWith("=")
   onChange && onChange({name, value: newValue, type});
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (!doOnEnter) {
        e.preventDefault();
      }
      // Si doOnEnter es true, permite el comportamiento por defecto
    }
  };

  const handleWheel = (e) => {
    if (type === "number") {
      const direction = e.deltaY < 0 ? 1 : -1; // Determina la dirección del scroll
      const newValue = parseFloat(value || 0) + direction;
      const useValue = Math.max(0, newValue).toString(); // No permite valores negativos

      handleOnChange({target :{ name, value: useValue }});
    }
  };

  const hasValue = value && value !== "";

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
          text-gray-900
          block w-full
          px-2.5 pt-6 pb-3
          h-[52px]
          border-0 border-b-2 border-gray-300
          bg-transparent
          focus:outline-none focus:ring-0
          focus:border-slate-400 peer
          transition-all duration-500 ease-in-out
          disabled:opacity-50 disabled:cursor-not-allowed
          placeholder:text-gray-500
          ${error?.error ? "border-red-500" : ""}
          ${pending || loading ? "bg-gray-50" : ""}
          ${type === "checkbox" ? "form-checkbox text-gray-900 mr-1 ml-auto h-auto py-0" : ""}
          ${actionIcon ? "pr-10" : ""}
          ${className}
          `}
        disabled={loading}
        style={type === "checkbox" ? { marginRight: 0, marginLeft: 'auto' } : {}}
        {...props}
      />

      {/* Label flotante dentro del input */}
      {label && (
        <span
          className={`absolute left-0 transition-all duration-500 ease-in-out px-2.5
            text-sm font-medium top-1 text-black
            ${hasValue || placeholder ? "top-1 text-sm" : "top-3 text-base"}`
          }
        >
          {label}
        </span>
      )}

      {/* Icono de acción */}
      {actionIcon && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          {actionIcon}
        </div>
      )}
        {error?.error && 
        <label htmlFor={name}
          className={`
            appearance-none absolute px-2 transition-all -bottom-0 -left-1
            font-medium text-red-400
            text-xs
          `}
        >
          {error.msg}
        </label>
        }
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
