import Label from "./Label";

const FormTitle = ({
  children,
  className,
  textClass,
  ...props
}) => (
  <div className={`flex justify-center w-full pb-2 ${className}`} {...props}>
    <span className={textClass}>{children}</span>
  </div>
);

export default FormTitle;
