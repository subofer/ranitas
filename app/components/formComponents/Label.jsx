const Label = ({ children, className, ...props }) => (
  <label className={`font-sans ${className}`} {...props}>
    {children}
  </label>
);

export default Label;
