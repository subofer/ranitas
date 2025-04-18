import { useState, useEffect } from 'react';
import Input from "@/app/components/formComponents/Input";

const generaLetrasColumnas = (cantidadColumnas, letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ") => {
  const base = letras.length;
  const obtenerNombreColumna = (num) =>
    num < 0 ? "" : obtenerNombreColumna(Math.floor(num / base) - 1) + letras[num % base];

  return [...Array(cantidadColumnas)].map((_, i) => obtenerNombreColumna(i));
};

export default function ExcelTable({ filas = 10, columnas = 10, titulos = [], dataArray = [] }) {
  columnas = titulos.length > 0 ? titulos.length : columnas;
  const colHeaders = generaLetrasColumnas(columnas);
  const [data, setData] = useState([]);

  // 🔥 Actualizar `data` cuando cambian `filas` o `columnas`
  useEffect(() => {
    setData(Array.from({ length: filas }, () => new Array(columnas).fill('')));
  }, [filas, columnas]); // <- Se ejecuta cada vez que `filas` o `columnas` cambian

  const handleChange = (rowIndex, colIndex, value) => {
    setData((prevData) => {
      const newData = [...prevData];
      newData[rowIndex] = [...newData[rowIndex]]; // Clonar la fila
      newData[rowIndex][colIndex] = value;
      return newData;
    });
  };

  return (
    <form>
      <div className="p-4 border rounded-xl bg-white shadow-md">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 border">#</th>
              {colHeaders.map((col, index) => (
                <th key={index} className="p-2 border">{titulos[index] ? titulos[index] : col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b">
                <td className="p-2 border font-bold">{rowIndex + 1}</td>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="p-2 border">
                    <Input
                      name={`${colHeaders[colIndex]}${rowIndex + 1}`}
                      value={cell}
                      onChange={(e) => handleChange(rowIndex, colIndex, e.target.value)}
                      className="w-full text-center"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
