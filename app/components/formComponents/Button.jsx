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
};

const Button = ({children, className, tipo = "default", ...props}) => (
  <button className={`
      ${tiposBotones.basic}
      ${tiposBotones[tipo]}
      ${className ? className : " " }
    ` }
    { ...props }
  >
    { children }
  </button>
);

export default Button;
