function FallbackComponent() {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="text-center">
        <p className="text-lg text-gray-600">Cargando...</p>
        {/* Aquí puedes agregar también una animación de carga si lo deseas */}
      </div>
    </div>
  );
}

export default FallbackComponent;
