'use client';

import { useState } from 'react';
import Input from "@/app/components/formComponents/Input";

const generaLetrasColumnas = (cantidadColumnas) => {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const columnas = [];
  for (let i = 0; i < cantidadColumnas; i++) {
    let nombreColumna = "";
    let num = i;
    while (num >= 0) {
      nombreColumna = letras[num % 26] + nombreColumna;
      num = Math.floor(num / 26) - 1;
    }
    columnas.push(nombreColumna);
  }
  return columnas;
};

export default function ExcelTable({ filas = 10, columnas = 10, titulos = [] }) {
  columnas = titulos.length > 0 ? titulos.length : columnas;
  const colHeaders = generaLetrasColumnas(columnas);
  const [data, setData] = useState(
    Array.from({ length: filas }, () => new Array(columnas).fill(''))
  );

  const handleChange = (rowIndex, colIndex, value) => {
    const newData = [...data];
    newData[rowIndex][colIndex] = value;
    setData(newData);
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
