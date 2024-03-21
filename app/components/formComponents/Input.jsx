"use client"
import Label from "./Label";

const Input = ({ label,...props }) => 
  <div className="flex w-full flex-row justify-between gap-4">
    <Label htmlFor={props.name}> { label }</Label>
    <input className="
        form-input
        w-3/5
        rounded
        border-2
        border-slate-200
        pr-1
        p-0
        text-right
      "
      {...props}
    />
  </div>
;

export default Input;
