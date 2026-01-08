import Image from "next/image";

const Producto = ({
  titulo,
  descripcion,
  imagen,
  hasImagen,
  precio,
  incidencia,
  nombreLocal,
  url,
}) => {

  return (
    <div className="w-full flex flex-row justify-between rounded overflow-hidden shadow-lg mb-4">
      <div className="w-4/5 px-6 py-4">
        <div className='flex flex-row gap-4'>
          <div className="font-bold text-xl mb-2">
          <a target="_blank" href={url} rel="noopener noreferrer">
            {incidencia} - {nombreLocal}
          </a>
          </div>
        </div>
        <div className='flex flex-row gap-4'>
          <div className="font-bold text-xl mb-2">${precio}</div>
          <div className="font-bold text-xl mb-2"> - </div>
          <div className="font-bold text-xl mb-2">{titulo}</div>
        </div>
        <p className="text-gray-700 text-base">{descripcion}</p>
      </div>
      <div className="w-24 h-24 relative">
        {
          hasImagen
            ? <Image src={imagen} alt={titulo} width={94} height={94}/>
            : null
        }

      </div>
    </div>
  );
}

export default Producto;