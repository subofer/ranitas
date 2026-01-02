import { alertaSiNoAcction } from './genericas/alertaSiNoAction';

export const alertaCrearCodigoDeBarras = async ({nombre}, action) => {
  const pregunta = {
    title: `Falta Codigo de Barras ${nombre}`,
    text: "Desea crear un codigo de barras automaticamente para el producto?",
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí',
    cancelButtonText: 'No',
  }

  const solucion = {
    true: {
      title: 'Codigo de barras',
      text: 'El codigo de barras se creo con exito',
      icon: 'success',
    },
    false : {
      title: 'Codigo de barras',
      text: 'No se guardo el producto.',
      icon: 'info',
    }
  }
  alertaSiNoAcction(action, pregunta, solucion);
}