import React, { useRef } from 'react';
import Icon from './formComponents/Icon';


const ImageToBase64Uploader = ({ onImageUpload }) => {
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onImageUpload(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <button
        onClick={handleButtonClick}
        className='
          active:scale-95
          drop-shadow-xl
          py-1
          active:drop-shadow
          rounded
          bg-slate-500
          p-2
          px-4
          text-white
          text-xl
          text-nowrap
        '
      > 
        <Icon className={"mr-1"} regular icono={"image"}/>
        Cargar imagen
      </button>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleImageChange}
        accept="image/*"
        style={{ display: 'none' }} // Esconde el input de archivo
      />
    </>
  );
};

export default ImageToBase64Uploader;
