"use client";
import React from "react";
import Icon from "../formComponents/Icon";

const PaginationControls = ({
  pagina,
  totalPaginas,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
  loading,
}) => {
  const goToNextPage = () => {
    if (pagina < totalPaginas) onPageChange(pagina + 1);
  };

  const goToPrevPage = () => {
    if (pagina > 1) onPageChange(pagina - 1);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow-sm">
      <div className="flex justify-between flex-1 sm:hidden">
        <button
          onClick={goToPrevPage}
          disabled={pagina === 1 || loading}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          onClick={goToNextPage}
          disabled={pagina === totalPaginas || loading}
          className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-700">
            Mostrando <span className="font-medium">{(pagina - 1) * perPage + 1}</span> a <span className="font-medium">{Math.min(pagina * perPage, total)}</span> de{' '}
            <span className="font-medium">{total}</span> resultados
          </p>
          <div className="flex items-center space-x-2">
            <label htmlFor="perPage" className="text-sm text-gray-600">Mostrar:</label>
            <select
              id="perPage"
              value={perPage}
              onChange={onPerPageChange}
              disabled={loading}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>
        <div>
          <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(1)}
              disabled={pagina === 1 || loading}
              className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50"
            >
              <span className="sr-only">Primera</span>
              <Icon icono="angles-left" />
            </button>
            <button
              onClick={goToPrevPage}
              disabled={pagina === 1 || loading}
              className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              <span className="sr-only">Anterior</span>
              <Icon icono="angle-left" />
            </button>
            
            {/* Páginas */}
            {[...Array(Math.min(5, totalPaginas))].map((_, i) => {
              let pageNum;
              if (totalPaginas <= 5) {
                pageNum = i + 1;
              } else if (pagina <= 3) {
                pageNum = i + 1;
              } else if (pagina >= totalPaginas - 2) {
                pageNum = totalPaginas - 4 + i;
              } else {
                pageNum = pagina - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  disabled={loading}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border ${
                    pagina === pageNum
                      ? 'z-10 bg-gray-800 border-gray-800 text-white'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={goToNextPage}
              disabled={pagina === totalPaginas || loading}
              className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              <span className="sr-only">Siguiente</span>
              <Icon icono="angle-right" />
            </button>
            <button
              onClick={() => onPageChange(totalPaginas)}
              disabled={pagina === totalPaginas || loading}
              className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50"
            >
              <span className="sr-only">Última</span>
              <Icon icono="angles-right" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default PaginationControls;
