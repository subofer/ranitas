import Label from "./Label";

const FormTitle = ({
  children,
  ...props
}) => (
  <div className="flex justify-center w-full pb-4" {...props}>
    <Label>{children}</Label>
  </div>
);

export default FormTitle;
