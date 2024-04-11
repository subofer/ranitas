import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

export const alertaSiNoAcction = async (action, pregunta, solucion, formData) => {
  const { isConfirmed } = await withReactContent(Swal).fire(pregunta)
  isConfirmed && action(formData ? formData : null)
  solucion[isConfirmed] && withReactContent(Swal).fire(solucion[isConfirmed])
}