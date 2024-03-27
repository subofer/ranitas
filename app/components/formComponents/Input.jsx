"use client"
import { useRef } from "react";
import Label from "./Label";

const Input = ({ label, className, ...props }) => {
  return (
  <Label className={`grid grid-cols-[max-content,1fr] items-center gap-2 ${className}`}>
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
        "
        {...props}
      />
    </Label>
  )
}
export default Input;
