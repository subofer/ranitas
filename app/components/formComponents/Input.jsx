"use client"
import { forwardRef } from "react";
const Input = forwardRef(({ name, type = "text", className, placeholder, label, value, ...props }, ref) => {
  return (
    <div className="relative">
      <input
        ref={ref}
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        className={`
          form-input
          block w-full
          px-2.5 pb-2.5
          pt-4 border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0
          focus:border-slate-400 peer
          text-right
          ${className}
          `}
        {...props}
      />
        <label
          htmlFor={name}
          className={`
            absolute left-0 transition-all px-2.5
            text-sm font-medium top-0.5 text-black
            peer-placeholder-shown:text-md peer-placeholder-shown:top-2.5 peer-focus:text-sm peer-focus:top-0.5`}
        >
          {label}
        </label>

    </div>
  );
})

Input.displayName = "Input"
export default Input;
