"use client"
import Label from "./Label";

const Option = ({text, ...props}) => <option {...props}>{text}</option>;

const Select = ({
  options,
  valueField,
  textField,
  label,
  ...props
}) => {
  return(
    <div className="flex w-full flex-row justify-between">
      <Label htmlFor={props.name}>{label}</Label>
      <select className="
        w-3/5
        form-select
        rounded
        border-2
        border-slate-200
        pr-1
        text-right
        "
        {...props}
      >
        {options?.map((o, i) =>
          <Option
            key={i}
            value={o[valueField]}
            text={o[textField]}
            className="
              text-left
            "
          />
          )}
      </select>
    </div>
)
};

export default Select;
