const Input = async ({
  name,
  label,
  type = "text"
}) => (
  <label> {label}
    <input name={name} type={type}/>
  </label>
);

export default Input;
