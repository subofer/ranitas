import Swal from 'sweetalert2'

export const showImagenProducto = async ({nombre, imagen}) => {
  
  const pregunta = {
    text: `${nombre}?`,
    html: `<div style="display: flex; flex-direction: column; justify-content: center; align-items: center;">
    <span style="text-align: center; font-weight: bold; font-size: 24px; margin-bottom: 20px;">${nombre}</span>
    <img style="width: 480px; height: auto" src="${imagen}" alt="Imagen del producto"/>
  </div>
`,
    toast: true,
    width: "600px",
  }
 await Swal.fire(pregunta)
}











/*
export const showImagenProducto = async (nombre, html) => {
  Swal.fire({
    title: nombre, // Asumiendo que quieres usar el parámetro 'nombre' como título.
    toast: true,
    //html,
    showConfirmButton: true,
    timer: null, // Asegurándonos de que el toast no se cierra automáticamente.
    didOpen: (toast, pepe, nana) => {
      console.log(toast)
      console.log(pepe)
      console.log(nana)
      let isDragging = false;
      let dragOffsetX = 0;
      let dragOffsetY = 0;
      const toastEl = toast;

      // Inicialmente, desactivamos las transiciones para un movimiento más fluido.
      toastEl.style.transition = 'none';

      const onMouseDown = (e) => {
        // Impide que el evento de clic cause el cierre del toast.
        e.preventDefault();

        isDragging = true;
        const rect = toastEl.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left; // Distancia horizontal desde el cursor al borde izquierdo del toast.
        dragOffsetY = e.clientY - rect.top; // Distancia vertical desde el cursor al borde superior del toast.

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };

      const onMouseMove = (e) => {
        if (!isDragging) return;

        // Calcula la nueva posición basada en la posición actual del cursor y el offset inicial.
        const newX = e.clientX - dragOffsetX;
        const newY = e.clientY - dragOffsetY;

        // Aplica la nueva posición al toast.
        toastEl.style.position = 'fixed';
        toastEl.style.left = `${newX}px`;
        toastEl.style.top = `${newY}px`;
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      toastEl.addEventListener('mousedown', onMouseDown);
    }
  });
};
*/