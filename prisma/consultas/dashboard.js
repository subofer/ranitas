"use server"

import prisma from "../prisma";

// Función para obtener métricas del dashboard
export async function getDashboardMetrics() {
  try {
    // Ventas del mes (suma de documentos de venta del mes actual)
    const currentMonth = new Date();
    currentMonth.setDate(1); // Primer día del mes

    const salesThisMonth = await prisma.documentos.aggregate({
      where: {
        tipoDocumento: {
          codigo: 'FACTURA_A' // O cualquier tipo de factura de venta
        },
        fecha: {
          gte: currentMonth
        },
        tipoMovimiento: 'SALIDA'
      },
      _sum: {
        total: true
      }
    });

    // Compras del mes (suma de documentos de compra del mes actual)
    const purchasesThisMonth = await prisma.documentos.aggregate({
      where: {
        tipoDocumento: {
          codigo: 'FACTURA_A' // O cualquier tipo de factura de compra
        },
        fecha: {
          gte: currentMonth
        },
        tipoMovimiento: 'ENTRADA'
      },
      _sum: {
        total: true
      }
    });

    // Productos en stock (conteo de productos)
    const productsCount = await prisma.productos.count();

    // Proveedores activos
    const suppliersCount = await prisma.contactos.count({
      where: {
        esProveedor: true
      }
    });

    // Facturas pendientes (documentos no pagados)
    const pendingInvoices = await prisma.documentos.aggregate({
      where: {
        estadoDocumento: {
          codigo: 'IMPAGA'
        }
      },
      _sum: {
        total: true
      }
    });

    // Caja actual (esto sería más complejo, necesitaría una tabla de movimientos de caja)
    // Por ahora, calculamos como ventas - compras del mes
    const cashFlow = (salesThisMonth._sum.total || 0) - (purchasesThisMonth._sum.total || 0);

    // Margen de ganancia (ventas - compras) / ventas * 100
    const totalSales = salesThisMonth._sum.total || 0;
    const totalPurchases = purchasesThisMonth._sum.total || 0;
    const profitMargin = totalSales > 0 ? ((totalSales - totalPurchases) / totalSales * 100) : 0;

    // Productos con stock bajo (tamaño < 10 unidades o sin precio definido)
    const lowStockProducts = await prisma.productos.findMany({
      where: {
        OR: [
          { size: { lt: 10 } },
          { precios: { none: {} } }
        ]
      },
      include: {
        categorias: true,
        precios: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { size: 'asc' }
    });

    // Valor del inventario (esto requeriría precios de costo)
    // Por simplicidad, calculamos un valor aproximado
    const inventoryValue = productsCount * 100; // Valor aproximado

  return {
    salesThisMonth: totalSales,
    purchasesThisMonth: totalPurchases,
    productsCount,
    suppliersCount,
    pendingInvoices: pendingInvoices._sum.total || 0,
    lowStockProducts,
    lowStockCount: lowStockProducts.length,
      cashFlow,
      profitMargin: Math.round(profitMargin * 100) / 100,
      inventoryValue
    };
  } catch (error) {
    console.error('Error obteniendo métricas del dashboard:', error);
    return {
      salesThisMonth: 0,
      purchasesThisMonth: 0,
      productsCount: 0,
      suppliersCount: 0,
      pendingInvoices: 0,
      cashFlow: 0,
      profitMargin: 0,
      inventoryValue: 0
    };
  }
}

// Función para obtener facturas (documentos)
export async function getInvoices(filter = 'all') {
  try {
    let whereClause = {};

    if (filter !== 'all') {
      // Filtrar por código de estado
      whereClause = {
        estadoDocumento: {
          codigo: filter
        }
      };
    }

    const invoices = await prisma.documentos.findMany({
      where: whereClause,
      include: {
        emisor: true,
        receptor: true,
        tipoDocumento: true,
        estadoDocumento: true
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    return invoices;
  } catch (error) {
    console.error('Error obteniendo facturas:', error);
    return [];
  }
}

// Función para obtener resumen ejecutivo
export async function getExecutiveSummary() {
  try {
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);

    // Ventas del mes actual y anterior
    const [currentSales, lastMonthSales] = await Promise.all([
      prisma.documentos.aggregate({
        where: {
          tipoDocumento: {
            codigo: {
              in: ['FACTURA_A', 'FACTURA_B', 'FACTURA_C']
            }
          },
          fecha: { gte: currentMonth },
          tipoMovimiento: 'SALIDA'
        },
        _sum: { total: true }
      }),
      prisma.documentos.aggregate({
        where: {
          tipoDocumento: {
            codigo: {
              in: ['FACTURA_A', 'FACTURA_B', 'FACTURA_C']
            }
          },
          fecha: { gte: lastMonth, lt: currentMonth },
          tipoMovimiento: 'SALIDA'
        },
        _sum: { total: true }
      })
    ]);

    const currentSalesTotal = currentSales._sum.total || 0;
    const lastMonthSalesTotal = lastMonthSales._sum.total || 0;
    const salesGrowth = lastMonthSalesTotal > 0 ?
      ((currentSalesTotal - lastMonthSalesTotal) / lastMonthSalesTotal * 100) : 0;

    // Compras del mes
    const purchases = await prisma.documentos.aggregate({
      where: {
        tipoDocumento: {
          codigo: {
            in: ['FACTURA_A', 'FACTURA_B', 'FACTURA_C']
          }
        },
        fecha: { gte: currentMonth },
        tipoMovimiento: 'ENTRADA'
      },
      _sum: { total: true }
    });

    const purchasesTotal = purchases._sum.total || 0;

    // Utilidad neta aproximada
    const netProfit = currentSalesTotal - purchasesTotal;

    return {
      netProfit,
      salesGrowth: Math.round(salesGrowth * 100) / 100,
      currentSales: currentSalesTotal,
      purchases: purchasesTotal,
      roi: currentSalesTotal > 0 ? Math.round((netProfit / currentSalesTotal) * 100 * 100) / 100 : 0
    };
  } catch (error) {
    console.error('Error obteniendo resumen ejecutivo:', error);
    return {
      netProfit: 0,
      salesGrowth: 0,
      currentSales: 0,
      purchases: 0,
      roi: 0
    };
  }
}
