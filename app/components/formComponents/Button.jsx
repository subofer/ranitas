const tiposBotones ={
  basic: `
    rounded
    px-6
    active:scale-95
    drop-shadow-xl
    active:drop-shadow
    transition duration-150 ease-in-out
    ring-2
  `,
  icono:`
    px-0
    transition duration-150 ease-in-out
  `  ,
  default: `
    bg-slate-200
    ring-slate-300
    hover:bg-slate-300
    hover:ring-slate-400
  `,
  neutro: `
    bg-teal-200
    ring-teal-300
    hover:bg-teal-300
    hover:ring-teal-400
  `,
  enviar: `
    bg-green-200
    ring-green-300
    hover:bg-green-300
    hover:ring-green-400
  `,
  borrar: `
    bg-red-200
    ring-red-300
    hover:bg-red-300
    hover:ring-red-400
  `,
  azul: `
    bg-blue-500
    hover:bg-blue-700
    text-white
    font-bold
    py-2
    ring-0
    rounded
    focus:outline-none
    focus:shadow-outline
  `,
  rojo:`
    bg-red-300
    hover:bg-red-400
    text-white
    font-bold
    py-2
    ring-0
    rounded
    focus:outline-none
    focus:shadow-outline
  `
};

const Spinner = () => (
  <div className="absolute top-0 bottom-0 right-0 left-0
  bg-black bg-opacity-25 flex justify-center items-center">
    <div className="
      align-bottom
      animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white
    "></div>
  </div>
);

const Button = ({children, loading = false, className, tipo = "default", ...props}) => (
   <button className={`
        ${tiposBotones.basic }
        ${tiposBotones[tipo]}
        ${className}
      ` }
      { ...props }
      disabled={loading}
    >
      {children}
    {loading && <Spinner />}
  </button>
);

export default Button;
