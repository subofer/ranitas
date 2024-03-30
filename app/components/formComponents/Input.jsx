"use client"
import { useEffect, useState, useRef, useCallback } from "react";
import Label from "./Label";
/*
const Input = ({ label, className, ...props }) => {
  return (
  <Label className={`grid grid-cols-[max-content,300px] justify-between  gap-2 ${className}`}>
      <span className={"pl-2 items-center"} >
        { label }
      </span>
      <input
        className="
          h-8
          form-input
          rounded
          border-2
          border-slate-200
          text-gray-700
          w-full
          disabled:bg-slate-200
          self-end
          text-right
        "
        {...props}
      />
    </Label>
  )
}
export default Input;

*/
const Input = ({ label, name, type = "text", placeholder, value,  ...props }) => {
  return (
    <div className="relative">
      <input
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
}

export default Input;
