"use client"
import { useEffect, useState, useCallback } from "react";

const useSelect = (geter)  => {
  if(!geter) throw Error('useSelect geter necesita una opcion')
  const [data, setData] = useState([])
  const [busy, setBusy] = useState(true)

  const actualizarDatos = useCallback(async () => {
    setBusy(true)
    const listadoDatos = await geter()
    setData(listadoDatos)
    setBusy(false)
  },[geter])

  useEffect(() => {
    actualizarDatos();
  }, [actualizarDatos])


  const filteredByKeyList = useCallback((list, key) => {
    setBusy(true)
    const lista = list?.map((item) => data.find((dataItem) => dataItem[key] == item[key])) || []
    setBusy(false)
    return lista;
  },[data])

  return {
    data,
    busy,
    filteredByKeyList,
  }
}

export default useSelect;