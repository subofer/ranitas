"use client"
import useFormControl from "@/app/hooks/useFormControl";
import Button from "./Button"
import FormTitle from "./Title"

const FormButtons = ({submitButtonText, resetButtonText, order, handleReset, loading}) => {

 return (
  <div className="flex flex-row w-full pt-4 justify-around">
    <Button loading={loading} tabIndex={order} type="submit" tipo={"enviar"}>{ submitButtonText || "Guardar" }</Button>
    <Button onClick={handleReset} tabIndex={order + 1} type="reset" tipo={"neutro"}>{ resetButtonText || "Reset" }</Button>
  </div>
  )
}

export const FormCard = ({children, title, loading, buttons, action, handleReset,className, ...props}) => {
  const {
    state,
    ...formControl
  } = useFormControl(action);

  return(
    <form
      className={`
        flex flex-col max-w-fit
        shadow-lg
        border-2
        border-gray-300
        bg-gray-200
        rounded-md
        p-4
        ${className}
      `}
      {...formControl}
      {...props}
    >
      { title && <FormTitle className={"col-span-full"}>{title}</FormTitle> }
      { children }
      { buttons !== false && <FormButtons loading={loading} handleReset={handleReset} order={props?.inputs?.length + 1 || props?.formlength || 0}/> }
      <div className="mt-2 h-2">
        { state?.error && state?.msg }
      </div>
    </form>
  )
};
