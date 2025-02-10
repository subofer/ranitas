import ExcelTable from "@/app/components/excell/tablaExcell";


const main = () => {
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
      <ExcelTable 
        filas={10}
        titulos={["Cantidad", "Producto", "Precio", "Total"]}
      />
    </main>

  )

}

export default main;