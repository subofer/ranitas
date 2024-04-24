const FormTitle = ({children, className, textClass, ...props}) => (
  <div className={`text-center pb-4 ${className}`} {...props}>
    <span className={textClass}>{children}</span>
  </div>
);

export default FormTitle;
