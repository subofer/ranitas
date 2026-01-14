import { useState, useCallback } from 'react';

export default function useProductosEdit() {
  const [modoEdicionManual, setModoEdicionManual] = useState(false);
  const [editsProductos, setEditsProductos] = useState({});
  const [editsPresentaciones, setEditsPresentaciones] = useState({});
  const [guardandoCambios, setGuardandoCambios] = useState(false);

  const hayCambios = Object.keys(editsProductos).length > 0 || Object.keys(editsPresentaciones).length > 0;

  const toggleModoEdicion = useCallback((valor) => {
    setModoEdicionManual((prev) => typeof valor === 'boolean' ? valor : !prev);
  }, []);

  const setProductoEdit = useCallback((edits) => {
    setEditsProductos((prev) => {
      if (typeof edits === 'function') return edits(prev);
      return edits || {};
    });
  }, []);

  const setPresentacionEdit = useCallback((edits) => {
    setEditsPresentaciones((prev) => {
      if (typeof edits === 'function') return edits(prev);
      return edits || {};
    });
  }, []);

  const guardarCambios = useCallback(async (callback) => {
    setGuardandoCambios(true);
    try {
      if (callback) {
        await callback();
      }
    } finally {
      setGuardandoCambios(false);
    }
  }, []);

  return {
    modoEdicionManual,
    toggleModoEdicion,
    guardandoCambios,
    editsProductos,
    editsPresentaciones,
    setProductoEdit,
    setPresentacionEdit,
    hayCambios,
    guardarCambios,
  };
}
