"use client";
import React from "react";

const ProductGridPlaceholder = ({ count }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
      {[...Array(count)].map((_, index) => (
        <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Imagen del producto */}
          <div className="aspect-w-1 aspect-h-1 bg-gray-200 relative h-48 w-full"></div>

          {/* Contenido del producto */}
          <div className="p-4">
            <div className="mb-4 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>

            {/* Información técnica */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <div className="h-4 bg-gray-100 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                <div className="h-4 bg-green-200 rounded w-1/4"></div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="h-4 bg-gray-100 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/5"></div>
              </div>
            </div>

            {/* Categorías */}
            <div className="flex flex-wrap gap-1 mb-4">
              <div className="h-6 w-16 rounded-md bg-gray-100"></div>
              <div className="h-6 w-16 rounded-md bg-gray-100"></div>
            </div>

            {/* Acciones */}
            <div className="flex space-x-2">
              <div className="h-8 w-24 rounded-lg bg-gray-100"></div>
              <div className="h-8 w-8 rounded-lg bg-gray-100"></div>
              <div className="h-8 w-8 rounded-lg bg-red-100"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductGridPlaceholder;
