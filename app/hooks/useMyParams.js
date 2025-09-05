"use client"
import { revalidatePath } from "next/cache";
import {  usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export const useMyParams = (preFiltro) => {
  const { push } = useRouter();
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const generateParams = useCallback((newParams, excludeKey) => {
    const updatedParams = new URLSearchParams(searchParams);
    updatedParams.delete(excludeKey);
    Object.entries(newParams).forEach(([key, value]) => {
      updatedParams.set(key, value);
    });
    push(`${pathname}?${updatedParams.toString()}`);
  }, [pathname, searchParams, push]);

  const addParam = useCallback((param, value) => {
    generateParams({ [param]: value }, param);
  }, [generateParams]);

  const deleteParam = useCallback((param) => {
    generateParams({}, param);
  }, [generateParams]);

  const clearParams = useCallback(() => {
    push(pathname)
  },[push, pathname])

  const searchParamsEntries = useMemo(() => [...searchParams.entries()], [searchParams])

  const params = useMemo(() =>
    searchParamsEntries.reduce((obj, [key, value]) => {
      obj[key] = value
      return obj
    }, {}
  ),[searchParamsEntries])

  const paramsList = useMemo(() => searchParamsEntries.map(([key]) => key),[searchParamsEntries])

  const param = useMemo(() => params[preFiltro] ,[params, preFiltro])

  const setParam = useCallback((value) => value ? addParam(preFiltro, value) : deleteParam(preFiltro) ,[addParam, deleteParam, preFiltro])

  const recarga = () => deleteParam("253j4n")

  return {
    param,
    setParam,
    params,
    pathname,
    paramsList,
    searchParams,
    clearParams,
    deleteParam,
    addParam,
    recarga,
  }
};

export default useMyParams;
