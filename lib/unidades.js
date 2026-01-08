// Calcula la distancia de Levenshtein entre dos cadenas
function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }

  return matrix[b.length][a.length];
}

// Encuentra la unidad más parecida dada una lista de unidades y una unidad de entrada
function findClosestUnit(unitList, inputUnit) {
  let closestUnit = unitList[0];
  let smallestDistance = levenshteinDistance(closestUnit, inputUnit);

  for (const unit of unitList) {
    const distance = levenshteinDistance(unit, inputUnit);
    if (distance < smallestDistance) {
      closestUnit = unit;
      smallestDistance = distance;
    }
  }

  return closestUnit;
}

// Ejemplo de uso
const unidades = {
  imperial: ['deg', 'sq in', 'sq ft', 'sq mi', 'ac', 'bits', 'B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'J', 'lbf', 'in', 'ft', 'yd', 'mi', 'oz', 'lb', 'W', 'kW', 'MW', 'GW', 'TW', 'PW', 'psi', 'F', 'fs', 'ps', 'ns', 'µs', 'ms', 's', 'min', 'h', 'd', 'y', 'tsp', 'tbsp', 'fl oz', 'cup', 'pt', 'qt', 'gal'],
  metric: ['deg', 'mm2', 'cm2', 'm2', 'km2', 'bits', 'B', 'KB', 'MB', 'GB', 'TB', 'PB', 'J', 'N', 'mm', 'cm', 'm', 'km', 'mg', 'g', 'kg', 'W', 'kW', 'MW', 'GW', 'TW', 'PW', 'Pa', 'C', 'fs', 'ps', 'ns', 'µs', 'ms', 's', 'min', 'h', 'd', 'y', 'mL', 'L'],
};

// Busca la unidad más parecida en el sistema métrico
const closestMetricUnit = findClosestUnit(unidades.metric, 'cm');
console.log('La unidad métrica más parecida es:', closestMetricUnit);

// Busca la unidad más parecida en el sistema imperial
const closestImperialUnit = findClosestUnit(unidades.imperial, 'inch');
console.log('La unidad imperial más parecida es:', closestImperialUnit);
