const Select = async ({
  name,
  form,
  defaultText,
  options,
  value,
  text,
  type
}) => (
  <select name={name} form={form} type={type}>
    <option>{defaultText}</option>
    {options.map((option, index) => (
      <option key={index} value={option[value]}>
        {option[text]}
      </option>
    ))}
  </select>
);

export default Select;
