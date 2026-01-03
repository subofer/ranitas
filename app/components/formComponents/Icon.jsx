const icons = (icono) => {
  switch(icono){
    case "eliminar": return "trash-can hover:text-red-500";
    case "editar": return "pen-to-square hover:text-blue-500";
    case "salvar": return "floppy-disk hover:text-green-500";
    default: return `${icono}`;
  }
}

const Icon = ({className, rotate, children, icono, type, regular, suspense,  ...props}) => {
  // Si se pasan props de click o se especifica type="button", renderizar como botón
  if (props.onClick || type === "button") {
    return (
      <button
        type={type || "button"}
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
  }

  // Si no es interactivo, renderizar solo el ícono
  return (
    <i className={`${regular?"fa-regular":"fa-solid"} fa-${icons(icono)} ${rotate ? 'rotate-180' : 'rotate-0'} ${className}`}>
      {children}
    </i>
  );
};

export default Icon;
