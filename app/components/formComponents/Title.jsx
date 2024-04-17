const FormTitle = ({children, className, textClass, ...props}) => (
  <div className={`text-center pb-4 ${className}`} {...props}>
    <p className={textClass}>{children}</p>
  </div>
);

export default FormTitle;
