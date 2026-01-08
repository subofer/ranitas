import { forwardRef } from 'react';
import FilterSelect from "../formComponents/FilterSelect";

const SelectOnClientByProps = forwardRef((props, ref) => <FilterSelect ref={ref} {...props} />);

SelectOnClientByProps.displayName = "SelectOnClientByProps"
export default SelectOnClientByProps;
