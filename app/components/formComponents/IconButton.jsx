import Button from "./Button";

const icons = (icono) => {
  switch(icono){
    case "eliminar": return "trash-can hover:text-red-500";
    case "editar": return "pen-to-square hover:text-blue-500";
    case "salvar": return "floppy-disk hover:text-green-500";
    default: return "gear";
  }
}

const IconButton = ({className, icono, ...props}) => (
  <Button
    className={`pr-2 bg-transparent ring-transparent ${className}`}
    tipo="icono"
    { ...props }
  >
      <i className={`fa-solid fa-${icons(icono)}`}></i>
  </Button>
);

export default IconButton;
