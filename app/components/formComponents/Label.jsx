const Label = ({ children,className, ...props }) => (
  <label className={`font-sans text-base ${className}`} {...props}>
    {children}
  </label>
);

export default Label;
