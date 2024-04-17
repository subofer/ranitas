"use client"
import { useEffect, useState, useCallback } from "react";

const useSelect = (geter)  => {
  if(!geter) throw Error('useSelect geter necesita una opcion')
  const [data, setData] = useState([])
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    const actualizarDatos = async () => {
      setBusy(true)
      const listadoDatos = await geter()
      setData(listadoDatos)
    }
    actualizarDatos();
  }, [geter])

  useEffect(() => {
    data && setBusy(false)
  }, [data])

  const filteredByKeyList = useCallback((list, key) => {
    setBusy(true)
    const lista = list.map((item) => data.find((dataItem) => dataItem[key] == item[key]))
    setBusy(false)
    return lista;
  },[data])

  return {
    data,
    filteredByKeyList,
    busy,
  }
}

export default useSelect;