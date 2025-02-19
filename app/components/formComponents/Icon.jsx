const icons = (icono) => {
  switch(icono){
    case "eliminar": return "trash-can hover:text-red-500";
    case "editar": return "pen-to-square hover:text-blue-500";
    case "salvar": return "floppy-disk hover:text-green-500";
    default: return `${icono}`;
  }
}

const Icon = ({className, rotate, children, icono, type = "button", regular, suspense,  ...props}) => (
  <button
    type={type}
    className={`
      active:scale-[90%]
      transition duration-150 ease-in-out
      disabled:cursor-not-allowed
      ring-transparent
      ${className}
      `}
    { ...props }
  >
    <div className="flex flex-row align-middle">
      <div className="flex h-full w-fit my-auto mx-auto align-middle">
        <i className={`h-full ${regular?"fa-regular":"fa-solid"} fa-${icons(icono)} ${rotate ? 'rotate-180' : 'rotate-0'}`}/>
      </div>
      <div className={`${children ? "ml-1 align-top" : ""}`}>
        {children}
      </div>
    </div>

 </button>
);

export default Icon;
