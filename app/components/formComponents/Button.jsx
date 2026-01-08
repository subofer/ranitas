import Icon from "./Icon";

const tiposBotones ={
  basic: `
    inline-flex
    items-center
    justify-center
    px-4
    py-2.5
    text-sm
    font-medium
    rounded-lg
    border
    transition-all
    duration-200
    ease-in-out
    focus:outline-none
    focus:ring-2
    disabled:opacity-50
    disabled:cursor-not-allowed
    disabled:pointer-events-none
    active:scale-[0.98]
  `,
  default: `
    bg-gray-100
    border-gray-300
    text-gray-700
    hover:bg-gray-200
    hover:border-gray-400
    focus:ring-gray-400
    shadow-sm
    hover:shadow-md
  `,
  neutro: `
    bg-white
    border-gray-300
    text-gray-700
    hover:bg-gray-50
    hover:border-gray-400
    focus:ring-gray-400
    shadow-sm
    hover:shadow-md
  `,
  enviar: `
    bg-green-600
    border-green-600
    text-white
    hover:bg-green-700
    hover:border-green-700
    focus:ring-green-500
    shadow-sm
    hover:shadow-md
  `,
  borrar: `
    bg-red-600
    border-red-600
    text-white
    hover:bg-red-700
    hover:border-red-700
    focus:ring-red-500
    shadow-sm
    hover:shadow-md
  `,
  azul: `
    bg-blue-600
    border-blue-600
    text-white
    hover:bg-blue-700
    hover:border-blue-700
    focus:ring-blue-500
    shadow-sm
    hover:shadow-md
  `,
  inline:`
    bg-gray-600
    border-gray-600
    text-white
    hover:bg-gray-700
    hover:border-gray-700
    focus:ring-gray-500
    shadow-sm
    hover:shadow-md
  `,
  filtro: `
    bg-blue-50
    border-blue-200
    text-blue-700
    hover:bg-blue-100
    hover:border-blue-300
    focus:ring-blue-400
    shadow-sm
    hover:shadow-md
  `,
  totales: `
    bg-emerald-50
    border-emerald-200
    text-emerald-700
    hover:bg-emerald-100
    hover:border-emerald-300
    focus:ring-emerald-400
    shadow-sm
    hover:shadow-md
  `
};

const Spinner = () => (
  <div className="absolute inset-0 bg-white bg-opacity-80 flex justify-center items-center rounded-lg">
    <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-gray-600">
    </div>
  </div>
);

const Button = ({suspense, children, loading = false, className, tipo = "default", ...props}) => (
  <button
    className={`
      ${tiposBotones.basic}
      ${tiposBotones[tipo]}
      ${className || ""}
      relative overflow-hidden
    `}
    disabled={loading || props.disabled}
    {...props}
  >
    {loading ? (
      <>
        <span className="opacity-0">{children}</span>
        <Spinner />
      </>
    ) : (
      <span className="relative z-10">{children}</span>
    )}
  </button>
);

export default Button;
