"use client"
import { useEffect, useState, useCallback } from "react";

const selectCache = new Map();

export default function useSelect(geter, t) {
  if(!geter) throw Error('useSelect geter necesita una opcion')
  const [data, setData] = useState([])
  const [busy, setBusy] = useState(true)
  const [select, setSelect] = useState([])

  const getDatos = useCallback(async () => {
    try {
      setBusy(true);
      const key = `${t || ''}`;
      if (selectCache.has(key)) {
        setData(selectCache.get(key) || []);
        return;
      }

      const res = await geter();
      const arr = Array.isArray(res) ? res : [];
      selectCache.set(key, arr);
      setData(arr);
    } catch (error) {
      console.error('Error al obtener datos:', error);
      setData([]);
      setBusy(false);
    } finally {
      setBusy(false);
    }
  },[geter, t])


  const filterByKeyList = useCallback(async (list, key) => {
    try{
      setBusy(true)
      const lista = list?.map((item) => data.find((dataItem) => dataItem[key] == item[key])) || []
      setSelect(lista);
    } catch (e){
      setSelect([]);
    } finally{
      setBusy(false)
    }
  },[data])

  useEffect(() => {
    getDatos()
    return () => {
      setBusy(false)
    }
  }, [getDatos])

  return {
    busy,
    data,
    select,
    filterByKeyList,
  }
}
