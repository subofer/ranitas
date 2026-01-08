export const contarObjetosEnArray = (arrayDeObjetos, clave) =>{
  const resultado = {};
  arrayDeObjetos.forEach((p,i) => {
    !p[clave]
      ? resultado[`${i} - No Existe La Clave [${clave}]`] = { ...p, cantidad: 1 }
      : resultado[p[clave]]
        ? resultado[p[clave]].cantidad++
        : resultado[p[clave]] = { ...p, cantidad: 1 }
  })
  return Object.values(resultado);
}

const calc = (arrayDeObjetos, clave) => {
  return {
    total: () => arrayDeObjetos.reduce((acum, item) => acum + item[clave], 0),
    promedio: () => {
      const total = arrayDeObjetos.reduce((acum, item) => acum + item[clave], 0);
      return total / arrayDeObjetos.length;
    },
    maximo: () => arrayDeObjetos.reduce((max, item) => Math.max(max, item[clave]), arrayDeObjetos[0][clave]),
    minimo: () => arrayDeObjetos.reduce((min, item) => Math.min(min, item[clave]), arrayDeObjetos[0][clave]),
    mediana: () => {
      const valores = arrayDeObjetos.map(item => item[clave]).sort((a, b) => a - b);
      const medio = Math.floor(valores.length / 2);
      if (valores.length % 2 === 0) {
        return (valores[medio - 1] + valores[medio]) / 2.0;
      }
      return valores[medio];
    },
    varianza: () => {
      const mean = calc(arrayDeObjetos, clave).promedio();
      return arrayDeObjetos.reduce((acc, item) => acc + Math.pow((item[clave] - mean), 2), 0) / arrayDeObjetos.length;
    },
    desviacionEstandar: () => {
      const varianza = calc(arrayDeObjetos, clave).varianza();
      return Math.sqrt(varianza);
    }
  };
};

/**
 * Calcula valores estadísticos y financieros de un array de objetos basado en una clave específica.
 * @param {Object[]} arrayDeObjetos - El array de objetos a calcular.
 * @param {string} clave - La clave del valor numérico en los objetos del array.
 * @param {string} calculo - El tipo de cálculo a realizar. Opciones disponibles:
 * - 'total': Calcula la suma total de los valores.
 * - 'promedio': Calcula el promedio de los valores.
 * - 'maximo': Encuentra el valor máximo.
 * - 'minimo': Encuentra el valor mínimo.
 * - 'mediana': Calcula la mediana de los valores.
 * - 'varianza': Calcula la varianza de los valores.
 * - 'desviacionEstandar': Calcula la desviación estándar de los valores.
 * @returns {Object} Un objeto que contiene el cálculo solicitado.
 */
export const calculosFinancieros = (arrayDeObjetos, clave, calculo) => {
  if(arrayDeObjetos.length > 0){
    return {
      [calculo]: calc(arrayDeObjetos, clave)[calculo](),
    }
  }
};
