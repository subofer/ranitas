"use client"
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
    <Icon
      regular
      onClick={handleButtonClick}
      className='
        drop-shadow-xl
        py-1
        active:drop-shadow
        rounded
        bg-slate-500
        p-2
        px-4
        text-white
        text-nowrap
        mr-1
        -translate-y-6
        '
      icono={"image"}
    >
      <span className="ml-3 text-xl">
        Cargar imagen
      </span>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleImageChange}
        accept="image/*"
        hidden
        />
    </Icon>
  );
};

export default ImageToBase64Uploader;
