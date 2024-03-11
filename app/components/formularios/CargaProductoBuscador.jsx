export const CargaProductoBuscador = ({inputs, formData}) => {
  return (
    inputs.map(({ Component,name, ...props }, i) => (
      <Component
        name={name}
        tabIndex={i + 1}
        key={i}
        value={formData[name]}
        {...props}
      />
    ))
  );
};
