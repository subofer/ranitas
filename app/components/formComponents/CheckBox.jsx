"use client"
import Label from "./Label";

const Ipu = (props) => (
  <input
    type="checkbox"
    className="
      form-checkbox
      rounded
      border-gray-300
      text-indigo-600
      focus:ring-indigo-500
      dark:focus:ring-indigo-600
      dark:ring-offset-gray-800
      dark:bg-gray-700
      dark:border-gray-600
    "
    {...props}
  />
)

const CheckBox = ({ label, seter,...props }) => {
  const handleChange = (event) => {
    seter(event.target.checked);
  };
  
  return (
    <div className="flex w-full flex-row justify-between gap-4">
      {
        label
        ? <Label className="flex w-full flex-row justify-between gap-4">
            {label}
            <Ipu onChange={handleChange} {...props}/>
          </Label>
        : <Ipu onChange={handleChange} {...props}/>
      }
    </div>
  )
};

export default CheckBox;
