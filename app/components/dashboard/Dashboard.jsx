"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MetricCard } from './MetricCard';
import { getDashboardMetrics, getExecutiveSummary } from '@/prisma/consultas/dashboard';
import DnsSync from '@/components/DnsSync';

export function Dashboard() {
  const [metrics, setMetrics] = useState([]);
  const [executiveSummary, setExecutiveSummary] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [dashboardData, summaryData] = await Promise.all([
          getDashboardMetrics(),
          getExecutiveSummary()
        ]);

        const formattedMetrics = [
          {
            title: "Ventas del Mes",
            value: `$${dashboardData.salesThisMonth.toLocaleString()}`,
            change: summaryData.salesGrowth > 0 ? `+${summaryData.salesGrowth}%` : "Sin cambios",
            changeType: summaryData.salesGrowth > 0 ? "positive" : "neutral",
            icon: "💰",
            color: "green"
          },
          {
            title: "Compras Realizadas",
            value: `$${dashboardData.purchasesThisMonth.toLocaleString()}`,
            change: "Este mes",
            changeType: "neutral",
            icon: "🛒",
            color: "blue"
          },
          {
            title: "Caja Actual",
            value: `$${dashboardData.cashFlow.toLocaleString()}`,
            change: dashboardData.cashFlow >= 0 ? "Positivo" : "Negativo",
            changeType: dashboardData.cashFlow >= 0 ? "positive" : "negative",
            icon: "💵",
            color: dashboardData.cashFlow >= 0 ? "orange" : "red"
          },
          {
            title: "Flujo de Caja",
            value: `${dashboardData.cashFlow >= 0 ? '+' : ''}$${Math.abs(dashboardData.cashFlow).toLocaleString()}`,
            change: "Ventas - Compras",
            changeType: dashboardData.cashFlow >= 0 ? "positive" : "negative",
            icon: "📈",
            color: dashboardData.cashFlow >= 0 ? "purple" : "red"
          },
          {
            title: "Productos en Stock",
            value: dashboardData.productsCount.toString(),
            change: "Registrados",
            changeType: "neutral",
            icon: "📦",
            color: "indigo"
          },
          {
            title: "Margen de Ganancia",
            value: `${dashboardData.profitMargin}%`,
            change: dashboardData.profitMargin > 30 ? "Excelente" : dashboardData.profitMargin > 20 ? "Bueno" : "Regular",
            changeType: dashboardData.profitMargin > 20 ? "positive" : "neutral",
            icon: "📊",
            color: dashboardData.profitMargin > 30 ? "green" : "orange"
          },
          {
            title: "Facturas Pendientes",
            value: `$${dashboardData.pendingInvoices.toLocaleString()}`,
            change: "Por cobrar",
            changeType: "neutral",
            icon: "📄",
            color: "red"
          },
          {
            title: "Proveedores Activos",
            value: dashboardData.suppliersCount.toString(),
            change: "Registrados",
            changeType: "neutral",
            icon: "🏭",
            color: "blue"
          }
        ];

        setMetrics(formattedMetrics);
        setExecutiveSummary(summaryData);
      } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
        // Fallback a datos simulados en caso de error
        setMetrics([
          {
            title: "Ventas del Mes",
            value: "$0",
            change: "Sin datos",
            changeType: "neutral",
            icon: "💰",
            color: "green"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Financiero</h2>
          <p className="text-sm text-gray-600 mt-1">Métricas clave de ventas, compras y flujo de caja</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full font-medium">📈 Actualizado</div>
          <div className="hidden sm:block">
            <DnsSync className="w-64" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Resumen financiero y operativo */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Resumen Ejecutivo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Utilidad Neta</div>
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">$</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              ${executiveSummary.netProfit?.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-gray-500 flex items-center">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                executiveSummary.salesGrowth > 0 ? 'bg-green-500' :
                executiveSummary.salesGrowth < 0 ? 'bg-red-500' : 'bg-gray-400'
              }`}></span>
              {executiveSummary.salesGrowth > 0 ? `+${executiveSummary.salesGrowth}%` : 'Sin cambios'} vs mes anterior
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">ROI del Inventario</div>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">%</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {executiveSummary.roi || 0}%
            </div>
            <div className="text-sm text-gray-500">
              {executiveSummary.roi > 100 ? 'Excelente rotación' :
               executiveSummary.roi > 50 ? 'Buena rotación' : 'Mejorar rotación'}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Costo de Adquisición</div>
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">💰</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              ${(executiveSummary.purchases || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              {executiveSummary.currentSales > 0 ?
                `${Math.round((executiveSummary.purchases / executiveSummary.currentSales) * 100)}% del total` :
                'Sin ventas registradas'}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Valor del Inventario</div>
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">📦</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              ${(executiveSummary.currentSales * 0.35 || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Basado en ventas mensuales</div>
          </div>
        </div>

        {/* KPIs adicionales */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Valor del Inventario</div>
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">📦</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              ${(executiveSummary.currentSales * 0.35 || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Estimado basado en ventas</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Productos Activos</div>
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">📊</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {metrics.find(m => m.title === "Productos en Stock")?.value || '0'}
            </div>
            <div className="text-sm text-gray-500">Disponibles para venta</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Proveedores</div>
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">🏭</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {metrics.find(m => m.title === "Proveedores Activos")?.value || '0'}
            </div>
            <div className="text-sm text-gray-500">Activos en el sistema</div>
          </div>
        </div>

        {/* Alertas importantes */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link href="/stock-bajo" className="block">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 hover:bg-yellow-100 transition-colors cursor-pointer">
              <div className="flex items-start">
                <div className="text-yellow-600 mr-3 text-xl">⚠️</div>
                <div className="flex-1">
                  <div className="font-medium text-yellow-800">Productos con Stock Bajo</div>
                  <div className="text-sm text-yellow-700 mt-1">
                    {executiveSummary?.lowStockCount || 3} productos requieren reposición inmediata
                  </div>
                  <div className="text-xs text-yellow-600 mt-2 flex items-center">
                    <span>Ver detalles</span>
                    <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 111.414 1.414L11 18.414l-6.707-6.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </Link>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start">
              <div className="text-green-600 mr-3 text-xl">🎯</div>
              <div>
                <div className="font-medium text-green-800">Meta Mensual Superada</div>
                <div className="text-sm text-green-700 mt-1">Objetivo de ventas alcanzado al 112%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
