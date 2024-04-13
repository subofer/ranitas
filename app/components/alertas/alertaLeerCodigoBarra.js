import Swal from 'sweetalert2'

export const alertaLeerCodigoBarra = async (codigo, action) => {
  const pregunta = {
    title: `Codigo leido:`,
    text: `${codigo}`,
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Aceptar',
    cancelButtonText: 'Cancelar',
  }
  const { isConfirmed } = await Swal.fire(pregunta)
  isConfirmed && action(codigo ? codigo : null)
}


