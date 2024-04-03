import { useState, useEffect, useCallback } from 'react';

function useArrayNavigator(array) {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((prevIndex) => (prevIndex + 1) % array.length);
  }, [array.length]);

  const prev = useCallback(() => {
    setIndex((prevIndex) => (prevIndex - 1 + array.length) % array.length);
  }, [array.length]);

  useEffect(() => {
    if (array.length === 0) {
      setIndex(0);
    } else if (index >= array.length) {
      setIndex(array.length - 1);
    }
  }, [array.length, index]);

  const item = array[index] || null;
  const indexPrevio = index === 0 ? array.length - 1 : index - 1;
  const indexProximo = (index + 1) % array.length;

  return {
    index,
    indexPrevio,
    indexProximo,
    item,
    next,
    prev
  };
}

export default useArrayNavigator;
