"use client"
import { useFormStatus } from "react-dom";
import useFormControl from "@/app/hooks/useFormControl";
import Button from "./Button"
import FormTitle from "./Title"

const FormButtons = ({submitButtonText, busy, resetButtonText, order, handleReset}) => {
  const { pending } = useFormStatus()
  let isBusy = pending || busy;

  return (
    <div className="flex flex-row w-full pt-4 justify-around">
      <Button loading={isBusy} tabIndex={order} type="submit" tipo={"enviar"}>{ submitButtonText || "Guardar" }</Button>

      <Button onClick={handleReset} tabIndex={order + 1} type="reset" tipo={"neutro"}>{ resetButtonText || "Reset" }</Button>
    </div>
  )
}

export const FormCard = ({
  children,
  title,
  busy,
  loading,
  buttons,
  action,
  handleReset,
  className,
  ...props
}) => {
  const {
    state,
    ...formControl
  } = useFormControl(action);

  return(
    <form
      className={`flex flex-col w-full h-fit p-2 ${className}`}
      {...formControl}
      {...props}
    >
      { title &&
        <FormTitle className={`w-full text-3xl font-bold text-slate-500`}>
          {title}
        </FormTitle>
      }
      { children }
      { buttons !== false && <FormButtons busy={busy} handleReset={handleReset} order={props?.inputs?.length + 1 || props?.formlength || 0}/> }
      <div className="mt-2 h-2">
        { state?.error && state?.msg }
      </div>
    </form>
  )
};
