import { alertaSiNoAcction } from './genericas/alertaSiNoAction';

export const alertaBorrarCategoria = async ({nombre}, action) => {
  const pregunta = {
    title: `Borrar Categoria "${nombre}"?`,
    text: "Se rompen las listas de precios, los provedores, se arma terrible cagada.",
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, bórralo, soy loco!',
    cancelButtonText: 'No, Para un poco...!',
  }

  const solucion = {
    true: {
      title: '¡Borrado!',
      text: 'Categoria eliminada',
      icon: 'success',
    },
    false : {
      title: '¡No se borro!',
      text: 'Menos mal, no se como termina el tema.',
      icon: 'info',
    }
  }
  alertaSiNoAcction(action, pregunta, solucion);
}