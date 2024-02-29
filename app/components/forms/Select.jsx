const Option = ({value, text}) => <option value={value}>{text}</option>;

const Select = async ({
  defaultText,
  defaultValue,
  options,
  valueField,
  textField,
  ...props
}) => {
  return(
    <select {...props}>
      <Option value={defaultValue} text={defaultText}/>
      {options.map((o, i) => 
        <Option key={i} value={o[valueField]} text={o[textField]} />
      )}
    </select>
)
};

export default Select;
