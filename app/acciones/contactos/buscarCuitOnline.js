"use server";

import fetchCuitOnline from "@/lib/fetchCuitOnline";

export const buscar = async (formData) => {
  if (!formData?.cuit) return { error: true };
  console.time("fetchCuitOnline");
  const data = await fetchCuitOnline(formData?.cuit);
  console.timeEnd("fetchCuitOnline");
  return {
    error: false,
    ...data,
  };
};
