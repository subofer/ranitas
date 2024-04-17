const icons = (icono) => {
  switch(icono){
    case "eliminar": return "trash-can hover:text-red-500";
    case "editar": return "pen-to-square hover:text-blue-500";
    case "salvar": return "floppy-disk hover:text-green-500";
    default: return `${icono}`;
  }
}

const Icon = ({className, children, icono, type = "button", regular, suspense,  ...props}) => (
  <button
    type={type}
    className={`
      active:scale-[90%]
      transition duration-150 ease-in-out
      disabled:bg-slate-400
      disabled:cursor-not-allowed
      ring-transparent
      ${className}
      `}
    { ...props }
  >
    <i className={`${regular?"fa-regular":"fa-solid"} fa-${icons(icono)}`}/>
      {children}
 </button>
);

export default Icon;
