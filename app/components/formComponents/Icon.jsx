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
  <button
    className={`
      active:scale-[90%]
      transition duration-150 ease-in-out
      disabled:bg-slate-400
      disabled:cursor-not-allowed
      bg-transparent
      ring-transparent
      ${className}`}
    { ...props }
  >
      <i className={`fa-solid fa-${icons(icono)} ${className}`}>
        {children}
      </i>
  </button>
);

export default Icon;
