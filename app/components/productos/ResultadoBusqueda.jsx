import Image from "next/image";

const ResultadoBusqueda = ({ resultado }={}) => {
  const { comercio, logoComercio, categoria, titulo, enlace, imagen, rating, precio,descripcion } = resultado ;

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl mb-4">
      <div className="md:flex">
        <div className="md:flex-shrink-0">
          {
            imagen?.src
              ? <Image className="h-40 w-40 object-cover" src={imagen?.src} alt={imagen?.alt} width={140} height={140} />
              : <div className="h-40 p-6 w-40 bg-gray-200">No Image</div>
          }
        </div>
        <div className="p-8">
          <div className="flex flex-row items-center">
            {
              logoComercio?.src
              ? <Image className="h-6 w-6 object-cover mr-1" src={logoComercio?.src} alt={logoComercio?.alt} width={26} height={26} />
              : <div className="h-6 w-6 bg-gray-200 mr-1">{}</div>
            }
            <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
              {comercio}
            </div>
          </div>
          <a href={enlace.href} target="_blank" rel="noopener noreferrer" className="block mt-1 text-lg leading-tight font-medium text-black hover:underline">{titulo}</a>
          <p className="mt-2 text-gray-500">{categoria}</p>
          {descripcion}
          {rating.tieneRating && (
            <div className="mt-2">Rating: {rating.valor}% - {rating.opiniones} opinión(es)</div>
          )}
          <div className="mt-2 font-bold">
            ${precio.valor} - {precio.disponible ? `` : "No "} Disponible
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultadoBusqueda;
