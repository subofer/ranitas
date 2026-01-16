import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

/**
 * Muestra un diálogo de confirmación para eliminación
 * @param {string} mensaje - Mensaje a mostrar
 * @returns {Promise<boolean>} - true si el usuario confirmó
 */
export const confirmarEliminacion = async (mensaje) => {
  const result = await MySwal.fire({
    title: '¿Estás seguro?',
    text: mensaje,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  });
  return result.isConfirmed;
};

/**
 * Muestra un diálogo de confirmación genérico
 * @param {Object} options - Opciones del diálogo
 */
export const confirmar = async ({
  titulo = '¿Estás seguro?',
  mensaje = '',
  icono = 'question',
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  colorConfirmar = '#3085d6',
  colorCancelar = '#d33'
}) => {
  const result = await MySwal.fire({
    title: titulo,
    text: mensaje,
    icon: icono,
    showCancelButton: true,
    confirmButtonColor: colorConfirmar,
    cancelButtonColor: colorCancelar,
    confirmButtonText: textoConfirmar,
    cancelButtonText: textoCancelar
  });
  return result.isConfirmed;
};
