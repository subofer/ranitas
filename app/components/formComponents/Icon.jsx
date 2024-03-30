import Button from "./Button";

const icons = (icono) => {
  switch(icono){
    case "eliminar": return "trash-can hover:text-red-500";
    case "editar": return "pen-to-square hover:text-blue-500";
    case "salvar": return "floppy-disk hover:text-green-500";
    default: return `${icono}`;
  }
}

const Icon = ({className, children, icono, ...props}) => (
  <Button
    className={`bg-transparent ring-transparent ${className}`}
    tipo="icono"
    { ...props }
  >
      <i className={`z-auto fa-solid fa-${icons(icono)} ${className}`}>
        {children}
      </i>
  </Button>
);

export default Icon;
