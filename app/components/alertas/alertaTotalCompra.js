import Swal from 'sweetalert2'

const pregunta = {
  title: 'Cobrar Total',
  text: "Gracias por su compra!!",
  icon: 'warning',
  showCancelButton: true,
  confirmButtonColor: '#3085d6',
  cancelButtonColor: '#d33',
  confirmButtonText: 'Sí, bórralo!',
  cancelButtonText: 'No, cancelar!',
}

const solucion = {
  true: {
    title: '¡Borrado!',
    text: 'Proveedor eliminado',
    icon: 'success',
  },
  false : {
    title: '¡No se borro!',
    text: 'Menos mal, no me gusta perder proveedores',
    icon: 'info',
  }
}

export const alertaTotalCompra = async (action) => {
  const { isConfirmed } = await Swal.fire(pregunta)
  isConfirmed && action()
  solucion[isConfirmed] && Swal.fire(solucion[isConfirmed])
}