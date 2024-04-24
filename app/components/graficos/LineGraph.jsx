"use client"
import React from 'react';
import { Line } from 'react-chartjs-2';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Title, Tooltip, Legend } from 'chart.js';
import 'chartjs-adapter-date-fns'; // Importa el adaptador de fecha
import zoomPlugin from 'chartjs-plugin-zoom';

// Registrando los componentes necesarios de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,  // Asegúrate de registrar TimeScale
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

const LineChart = ({ data }) => {

  function adjustTimeUnit({chart}) {
    const r = chart.scales.x.max - chart.scales.x.min;
    const halfDay = 43200000;
    chart.options.scales.x.time.unit = r > 4 * halfDay ? "day" : r > halfDay ? "hour" : "minute"
    chart.update();
  }


  // Preparar los datos para Chart.js
  const chartData = {
    labels: data?.map(d => new Date(d.createdAt).toISOString()),
    datasets: [
      {
        label: 'Evolución de precios',
        data: data?.map(d => ({ x: new Date(d.createdAt).toISOString(), y: d.precio })),
        fill: false,
        backgroundColor: 'rgb(0, 150, 0)',
        borderColor: 'rgba(0, 150, 0, 1)',
      }
    ]
  };

  // Opciones para el gráfico
  const options = {
    scales: {
      x: {
        type: 'time', // Usa la escala de tiempo
        time: {
          unit: 'minute',
          tooltipFormat: 'dd/MM/yyyy' // Asegúrate de usar un formato soportado por date-fns
        }
      },
      y: {
        beginAtZero: true
      }
    },
    plugins: {
      zoom: {
          zoom: {
            wheel: {
              enabled: true, // Permite zoom con la rueda del mouse
            },
            pinch: {
              enabled: true // Permite zoom con gesto de pinza en dispositivos táctiles
            },
            mode: 'xy', // Permite zoom tanto en el eje X como en el eje Y
            onZoom: (chart) => adjustTimeUnit(chart),
        },
        pan: {
          enabled: true,
          mode: 'xy'
        }
      },
      tooltip: {
        bodyFont: { size: 16 },
      },
    },
    elements: {
      line: {
        tension: 0.1  // Ajusta esto para cambiar la suavidad de la línea
      }
    },
    responsive: true,
    maintainAspectRatio: false
  };

  return <Line data={chartData} options={options} />;
};

export default LineChart;
