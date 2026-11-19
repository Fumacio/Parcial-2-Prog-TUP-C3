"use client";
// Gráficos del tablero con Chart.js (obligatorio, sección 9) a través de react-chartjs-2.
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { moneda, nombresFormaPago } from "@/lib/formato";

// Chart.js necesita que se "registren" las piezas que se usan
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const COLORES = ["#2563eb", "#16a34a", "#f59e0b"];

/** RF-T2: ventas diarias de los últimos 30 días (barras). */
export function GraficoVentasDiarias({ datos }: { datos: { fecha: string; importe: number }[] }) {
  return (
    <div className="h-64">
      <Bar
        data={{
          // "2026-10-29" -> "29/10"
          labels: datos.map((d) => `${d.fecha.slice(8, 10)}/${d.fecha.slice(5, 7)}`),
          datasets: [{ label: "Ventas", data: datos.map((d) => d.importe / 100), backgroundColor: COLORES[0] }],
        }}
        options={{
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => moneda(Math.round(Number(c.raw) * 100)) } },
          },
          scales: { y: { ticks: { callback: (v) => moneda(Number(v) * 100).replace(",00", "") } } },
        }}
      />
    </div>
  );
}

/** RF-T2: ventas del mes por forma de pago (torta). */
export function GraficoFormasPago({ datos }: { datos: { forma: string; importe: number }[] }) {
  return (
    <div className="h-64">
      <Doughnut
        data={{
          labels: datos.map((d) => nombresFormaPago[d.forma]),
          datasets: [{ data: datos.map((d) => d.importe / 100), backgroundColor: COLORES }],
        }}
        options={{
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom" },
            tooltip: { callbacks: { label: (c) => ` ${moneda(Math.round(Number(c.raw) * 100))}` } },
          },
        }}
      />
    </div>
  );
}
