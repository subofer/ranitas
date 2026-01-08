import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

export const alertaSiNoAcction = async (action, pregunta, solucion, formData) => {
  const { isConfirmed } = await withReactContent(Swal).fire(pregunta)
  let response, error, mensajeSolucion, msg;
  if(isConfirmed) {
   const actionResponse = await action(formData ? formData : null)
   console.log(actionResponse) 
   response = actionResponse;
    error = actionResponse?.error;
    msg = actionResponse?.msg;
  }
  mensajeSolucion = error ? msg: solucion[isConfirmed]
  mensajeSolucion && withReactContent(Swal).fire(mensajeSolucion)
}