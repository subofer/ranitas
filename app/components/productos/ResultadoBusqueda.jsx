import { textos } from "@/lib/manipularTextos";
import Image from "next/image";
import Icon from "../formComponents/Icon";
import Barcode from 'react-barcode';
import { guardarProductoBuscado } from "@/prisma/serverActions/productos";
import Button from "../formComponents/Button";

const ResultadoBusqueda = ({ resultado, resaltado = false }={}) => {
  const {
    prismaObject,
    codigoDeBarras,
    comercio,
    logoComercio,
    categoria,
    titulo,
    enlace,
    imagen,
    rating,
    precio,
    descripcion,
    detalles,
    puntaje,
  } = resultado ;
  const handleSave = async () => {
    await guardarProductoBuscado(prismaObject)
  }
  if (titulo && comercio){  
  return (
    <div className={`
      w-full max-w-md mx-auto bg-white rounded-xl shadow-md
      ${resaltado && `shadow-gray-400 drop-shadow-2xl`}
      overflow-hidden md:max-w-2xl mb-4`
    }>
      <div className="md:flex">
        <div className="md:flex-shrink-0">
          <Image className="h-44 w-44 pt-8 object-cover" src={imagen?.src || '/ranita.png'} alt={imagen?.alt || 'Producto'} width={140} height={140} />
        </div>
        <div className="p-8">
          <div className="flex flex-row items-center">
            {
              logoComercio?.src
              ? <Image className="h-6 w-6 object-cover mr-1" src={logoComercio?.src} alt={logoComercio?.alt} width={26} height={26} />
              : <div className="h-6 w-6 bg-gray-200 mr-1">{}</div>
            }
            <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
              {comercio} {" ("}{puntaje}{")"}
            </div>

          </div>
          <a href={enlace.href} target="_blank" rel="noopener noreferrer" className="block mt-1 text-lg leading-tight font-medium text-black hover:underline">
            {detalles?.nombre || titulo}
          </a>
          {descripcion}
          {rating.tieneRating && (
            <div className="mt-2">{rating.tipo}:
              {
                rating.tipo=="Rating"
                ?`${rating.valor}%`
                :(Array.from({ length: rating.valor }, (_, index) => (
                    <Icon key={index} icono={"star"} className={"pl-0 pr-0 text-yellow-400 hover:text-yellow-600"}/>
                  )))
              } - {rating.opiniones} opinión(es)
              </div>
          )}
          <div className="mt-2 font-bold">
            ${precio.valor} - {precio.disponible ? `` : "No "} Disponible
          </div>
          <div className="mt-2 font-bold">
            {detalles.tieneUnidad
            ?`${detalles.cantidad} ${textos.mayusculas.todas(detalles.unidad)}`
            : "sin detalle de unidad"
          }
          </div>
          <div className={"flex h-10 w-6 ml-0 pl-0"}>
            <Icon icono={"barcode"} className={"-translate-x-3 px-0 py-0"}>
              <span className="px-2">
                {codigoDeBarras}
              </span> 
            </Icon>
              <div>
                  <Barcode className={"h-16"}value={codigoDeBarras} format="EAN13" />
              </div>
          </div>
          <p className="mt-2 text-gray-500">{categoria}</p>
          <Button onClick={handleSave}>Guardar Producto</Button>
        </div>
      </div>
    </div>
  );
  }else{
    return(null)
  }
};

export default ResultadoBusqueda;
