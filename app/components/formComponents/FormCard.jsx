"use client"
import { useFormStatus } from "react-dom";
import useFormControl from "@/hooks/useFormControl";
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
  formRef,
  ...props
}) => {
  const {
    state,
    ...formControl
  } = useFormControl(action);

  return(
    <form
      ref={formRef}
      className={`
        flex flex-col w-full h-fit
        bg-white border border-slate-200 rounded-lg shadow-lg
        ${className}
      `}
      {...formControl}
      {...props}
    >
      <div className="p-4">
        { title &&
          <FormTitle className={`w-full text-2xl font-bold text-slate-800 mb-4`}>
            {title}
          </FormTitle>
        }
        <div className="space-y-6">
          { children }
        </div>
        { buttons !== false &&
          <div className="mt-8 pt-6 border-t border-slate-200/60">
            <FormButtons busy={busy} handleReset={handleReset} order={props?.inputs?.length + 1 || props?.formlength || 0}/>
          </div>
        }
        <div className="mt-4 h-2">
          { state?.error && state?.msg }
        </div>
      </div>
    </form>
  )
};
