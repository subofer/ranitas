export const navegar = (indice, array = [], direccion = -1) => {
  const nuevoIndice = indice + direccion
  if (direccion == 1){
    return nuevoIndice > array.length-1 ? array.length-1 : nuevoIndice
  }else if (direccion == -1){
    return nuevoIndice < 0 ? 0 : nuevoIndice
  }
}
