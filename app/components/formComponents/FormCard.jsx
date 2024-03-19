"use client"
import useFormControl from "@/app/hooks/useFormControl";
import Button from "./Button"
import FormTitle from "./Title"

const FormButtons = ({submitButtonText, resetButtonText, order, handleReset, loading}) => (
  <div className="flex flex-row w-full pt-4 justify-around">
    <Button loading={loading} tabIndex={order} type="submit" tipo={"enviar"}>{ submitButtonText || "Guardar" }</Button>
    <Button onClick={handleReset} tabIndex={order + 1} type="reset" tipo={"neutro"}>{ resetButtonText || "Reset" }</Button>
  </div>
)

export const FormCard = ({children, loading, title, buttons, action, handleReset, ...props}) => {
  const {
    result,
    ...formControl
  } = useFormControl(action);
  return(
    <form
      className="
        flex flex-col max-w-fit
        shadow-lg
        border-2
        border-gray-300
        bg-gray-200
        rounded-md
        p-4
      "
      {...formControl}
      {...props}
    >
      { title && <FormTitle>{title}</FormTitle> }
      { children }
      { buttons !== false && <FormButtons loading={loading} handleReset={handleReset} order={props?.inputs?.length + 1 || props?.formlength || 0}/> }
      <div className="mt-2 h-2">
        { result?.error && result?.msg }
      </div>
    </form>
  )
};
