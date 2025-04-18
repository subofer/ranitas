"use client"
import { useEffect, useState } from "react";
import ExcelTable from "@/app/components/excell/tablaExcell";
import Input from "@/app/components/formComponents/Input";


const Page = () => {
  const [filasColumnas, setFilasColumnas] = useState({
    filas: 6,
    columnas: 5,
  });
  
  useEffect(() => {
    console.log(filasColumnas);
  }
  , [filasColumnas]);

  const handleOnChange = (e) => {
    setFilasColumnas((prev) => ({
      ...prev,
      [e.name]: Number(e.value),
    }));
  };

  return (

    <main
    className="
    w-full
    h-full
    bg-red-300

    "
    > 
      <h1>
        vamos a hacer como un excel
      </h1>
      <Input
        name="filas"
        label="Filas"
        type="number"
        value={filasColumnas.filas}
        onChange={handleOnChange}
      />
      <Input
        name="columnas"
        label="Columnas"
        type="number"
        value={filasColumnas.columnas}
        onChange={handleOnChange}
      />
      <ExcelTable 
        filas={filasColumnas.filas}
        columnas={filasColumnas.columnas}
        titulos={["nombre", "precio", "lo rico que esta"]}
      />
    </main>

  )

}

export default Page;