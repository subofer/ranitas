const formToObject = (formData) => {
  const obj = {}
  formData.forEach((value, key) => {
    if(!key.startsWith('$ACTION_')){
      return obj[key] = value
    }
  } );
  delete obj.ignore;
  delete obj.filterSelect;
  return obj;
}

export default formToObject;