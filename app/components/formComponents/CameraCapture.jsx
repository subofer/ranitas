"use client"
import React, { useRef, useState } from 'react';
import Icon from './Icon';

const CameraCaptureModal = ({ onCapture }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setCapturedImage('');
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing the camera:', error);
    }
  };

  const openModal = async () => {
    setIsModalOpen(true);
    startCamera();
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }
  const takePicture = () => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/png');
    setCapturedImage(imageDataUrl);
    stopCamera()
  };

  const handleSave = () => {
    onCapture(capturedImage);
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    stopCamera();
    setIsModalOpen(false);
    setStream(null);
    setCapturedImage('');
  };

  const handleRetry = () => {
    setCapturedImage('');
    startCamera();
  };

  if (!isModalOpen) {
    return (
        <button
          className={"rounded-full text-white bg-slate-500 "}
          onClick={openModal}
        >
          <Icon icono={"camera"}/>
        </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-75 flex justify-center items-center text-white">
      <div className="relative w-full max-w-3xl max-h-full overflow-hidden">
        {capturedImage ? (
          <img src={capturedImage} alt="Captured" style={{ width: '100%', height: 'auto' }} />
        ) : (
          <div className='rounded-2xl w-full h-full overflow-hidden'>

          <video
            ref={videoRef}
            autoPlay
            style={{ width: '100%', height: 'auto' }}
            />
          </div>
        )}
        {!capturedImage &&
          <div
            onClick={takePicture}
            className='bg-slate-500 rounded-full absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-3 p-1'
          >
            <div className='bg-white rounded-full p-0.5'>
              <button
                className="bg-slate-500 px-4 py-4 rounded-full"
                >
                <Icon icono={"camera"} className={"text-6xl"}/>
              </button>
            </div>
          </div>
        }
        <button
          className="absolute bg-slate-500 px-4 py-2 rounded-full top-2 right-2"
          onClick={handleCancel}>
              <Icon icono={"xmark"} className={"text-4xl text-red-300"}/>
        </button>
        {capturedImage && (
          <div className="flex flex-row gap-4 absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-3  ">
            <button
              className="bg-slate-500 px-5 py-4 rounded-full "
              onClick={handleSave}>
              <Icon icono={"check"} className={"text-6xl text-green-400"}/>
            </button>
            <button
              className="bg-slate-500 px-4 py-4 rounded-full "
              onClick={handleRetry}>
              <Icon icono={"ban"} className={"text-6xl text-red-400"}/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraCaptureModal;
