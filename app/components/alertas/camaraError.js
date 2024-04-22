import Swal from "sweetalert2";

const alertaCamara = () => {
  Swal.fire({
    icon: "error",
    title: "Error de protocolo",
    text: "Falta conexion Https para utilizar la camara",
  });
}
export default alertaCamara;