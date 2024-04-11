"use client"
import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import overlayImage from '../png/camara.png'
import Image from '../Image';

const CameraCaptureModal = ({ onCapture }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [videoReady, setVideoReady] = useState(true);
  const [capturedImage, setCapturedImage] = useState('');
  const [isCaptured, setIsCaptured] = useState(false);
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
  const takePicture = async () => {
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
    setVideoReady(true)
  };

  const handleRetry = () => {
    setVideoReady(true)
    setCapturedImage('');
    startCamera();
  };
  useEffect(() => {
    setIsCaptured(capturedImage != '')
  },[capturedImage]
  )
  useEffect(() => {
    setVideoReady(true)
  },[isModalOpen]
  )

  return (
    <>
      <Icon className={`rounded-full text-white bg-slate-500 `} onClick={openModal} icono={"camera"}/>
      { isModalOpen && (
      <div className={`fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-75 flex justify-center items-center text-white transition-opacity duration-500 opacity-${isModalOpen?"100":"0"}`}>
        <div className={`relative w-full max-w-3xl max-h-full overflow-hidden transition-opacity duration-500 opacity-${isModalOpen?"100":"0"}`}>
          { isCaptured
            ? (
              <>
              <Image src={capturedImage} alt="Captured" width={100} height={100} style={{ width: '100%', height: 'auto' }} />
              <div className="flex flex-row gap-4 absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-3  ">
                <Icon onClick={handleSave} icono={"check"} className={"bg-slate-500 px-5 py-4 rounded-full text-6xl text-green-400"}/>
                <Icon onClick={handleRetry} icono={"ban"} className={"bg-slate-500 px-4 py-4 rounded-full text-6xl text-red-400"}/>
              </div>
              </>
            ):(
              <div className={`w-full h-full overflow-hidden transition-opacity duration-150 opacity-${videoReady?"0":"100"}`}>
                <video onLoadedMetadata={()=>{setVideoReady(false)}} ref={videoRef} autoPlay style={{ width: '100%', height: 'auto'}}/>
                <div className={`absolute inset-0`}>
                  <Image src={overlayImage} alt="Overlay" layout='fill' objectFit='cover'/>
                </div>
                <div onClick={takePicture} className='bg-slate-500 rounded-full absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-3 p-1' >
                  <div className='bg-white rounded-full p-0.5'>
                    <div className="bg-slate-500 px-4 py-4 rounded-full">
                      <Icon icono={"camera"} className={"text-6xl"}/>
                    </div>
                  </div>
                </div>
                <Icon onClick={handleCancel} icono={"xmark"} className="absolute bg-slate-500 px-4 py-2 rounded-full top-2 right-2 text-4xl text-red-300"/>
              </div>
            )
          }
        </div>
      </div>
      )}
    </>
  );
};

export default CameraCaptureModal;
