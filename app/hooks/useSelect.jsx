"use client"
import { useEffect, useState, useCallback } from "react";

const useSelect = (geter)  => {
  if(!geter) throw Error('useSelect geter necesita una opcion')
  const [select, setSelect] = useState([])
  const [data, setData] = useState([])
  const [busy, setBusy] = useState(true)

  const actualizarDatos = useCallback(async () => {
    let result;
    try {
      setBusy(true);
      result = await geter();
    } catch (error) {
      console.error('Error al obtener datos:', error);
    } finally {
      setBusy(false);
      setData(result);
    }
  },[geter])

  const filterByKeyList = useCallback(async (list, key) => {
    setBusy(true)
    let lista = data;
    try {
      lista = list?.map((item) => data.find((dataItem) => dataItem[key] == item[key])) || []
    } catch (e) {
      console.log(e)
    } finally {
      setBusy(false)
      setSelect(lista);
    }
  },[data])

  useEffect(() => { actualizarDatos() }, [actualizarDatos])

  return {
    data,
    select,
    busy,
    filterByKeyList,
  }
}

export default useSelect;