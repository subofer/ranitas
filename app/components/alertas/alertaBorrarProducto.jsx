import { createPortal } from 'react-dom';
import { alertaSiNoAcction } from './genericas/alertaSiNoAction';

const P = ({ children }) => createPortal(
  children,
  document.getElementById('helpPortal')
);


export const alertaBorrarProducto = async ({imagen, nombre}, action) => {
  const pregunta = {
    title: `Borrar ${nombre}?`,
    text: "Se rompen las listas de precios, los provedores, se arma terrible cagada.",
    html: `<div style="display: flex; justify-content: center; animation: float 2s ease-in-out infinite;">
            <img style="width: 320px;" src="${imagen}" alt="img"/>
          </div>`,
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
    },
  }

  alertaSiNoAcction(action, pregunta, solucion);
}
