export default function debounce(func, wait = 500) {
  let timeout;

  function executedFunction(...args) {
    const later = () => {
      timeout = undefined;
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  }

  executedFunction.cancel = () => {
    clearTimeout(timeout);
    timeout = undefined;
  };

  return executedFunction;
}
