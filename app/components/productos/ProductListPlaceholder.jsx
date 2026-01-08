"use client";
import React from "react";

const ProductListPlaceholder = ({ count }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0 flex-1">
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                <div className="h-4 bg-gray-200 rounded w-2/3 ml-auto"></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[...Array(count)].map((_, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 rounded bg-gray-200"></div>
                    <div className="ml-3 space-y-1">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-100 rounded w-48"></div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="h-4 bg-gray-100 rounded w-20"></div>
                </td>
                <td className="px-3 py-3">
                  <div className="h-4 bg-gray-100 rounded w-24"></div>
                </td>
                <td className="px-3 py-3">
                  <div className="h-4 bg-gray-100 rounded w-16"></div>
                </td>
                <td className="px-3 py-3">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="h-4 bg-gray-100 rounded w-8 mx-auto"></div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end space-x-1">
                    <div className="h-7 w-7 rounded-md bg-gray-100"></div>
                    <div className="h-7 w-7 rounded-md bg-gray-100"></div>
                    <div className="h-7 w-7 rounded-md bg-gray-100"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductListPlaceholder;
