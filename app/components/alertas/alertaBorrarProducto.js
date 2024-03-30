import Swal from 'sweetalert2'

export const alertaBorrarProducto = async (action, nombre, html) => {
  const pregunta = {
    title: `Borrar ${nombre}?`,
    text: "Se rompen las listas de precios, los provedores, se arma terrible cagada.",
    
    html,
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, bórralo, soy loco!',
    cancelButtonText: 'No, Para un poco...!',
  }
  
  const solucion = {
    true: {
      title: '¡Borrado!',
      text: 'Producto eliminado',
      icon: 'success',
    },
    false : {
      title: '¡No se borro!',
      text: 'Menos mal, no se como termina el tema.',
      icon: 'info',
    }
  }


  const { isConfirmed } = await Swal.fire(pregunta)
  isConfirmed && action()
  solucion[isConfirmed] && Swal.fire(solucion[isConfirmed])
}