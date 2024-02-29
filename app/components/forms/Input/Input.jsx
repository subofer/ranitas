const Input = ({
  name,
  label,
  ...props
}) => (
  <label htmlFor={name}>
    {label}
    <input name={name} {...props}/>
  </label>
);

export default Input;
