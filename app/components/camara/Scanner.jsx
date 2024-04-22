import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode } from 'html5-qrcode';
import Icon from '../formComponents/Icon';
import useDeviceAndProtocol from '@/lib/testMobileHttp';
import alertaCamara from '../alertas/camaraError';

const formatos = [
  'code_128_reader',
  'ean_reader',
  'ean_8_reader',
  'code_39_reader',
  'code_39_vin_reader',
  'codabar_reader',
  'upc_reader',
  'upc_e_reader',
  'i2of5_reader',
  '2of5_reader',
  'code_93_reader'
]


const QrReader = ({ onScan, onError }) => {
  const { isMobile, isHttps } = useDeviceAndProtocol()
  const [isScanning, setIsScanning] = useState(false);
  const [isFlip, setIsFlip] = useState(false);
  const qrRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
        setIsScanning(false);
        console.log("Scanner stopped.");
      } catch (e) {
        console.error("Failed to stop the scanner: ", e);
      }
    }
  }, []);

  const flipCamera = () => setIsFlip((prev) => !prev)

  const startScanner = useCallback(async () => {
    if (isMobile && !isHttps) {
      console.log("Debe utilizar una conexion https para dispositivos moviles.");
      alertaCamara()
      return;
    }

    if (html5QrCodeRef.current) {
      console.log("Scanner is already running.", html5QrCodeRef.current);
      return;
    }

    await async function (){
      setIsScanning(true);
    }();

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const config = {
      fps: 50,
      qrbox: { width: .8* screenWidth, height: .5*screenHeight },
      formats: formatos, // Esto permite la lectura de códigos de barras
    };

    html5QrCodeRef.current = new Html5Qrcode(qrRef.current.id);
    try {
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText, decodedResult) => {
          console.log(`Code scanned = ${decodedText}`, decodedResult);
          onScan(decodedText);
          stopScanner();
        }
      );
    } catch (error) {
      onError(error);
    }
  }, [onScan, onError, stopScanner]);

  useEffect(() => {
    const modalElement = document.getElementById("modalUnico");
    modalElement.hidden = !isScanning;
  }, [isScanning]);

  return (
    <>
      <Icon type="button" icono={"camera"} onClick={startScanner} />
      {isScanning && (
        createPortal(
          <div className='fixed top-0 left-0 z-50 w-full h-full'>
            <div className='flex justify-center align-middle'>
              <div className='flex w-full h-full text-7xl text-white'>
                <div ref={qrRef} id="CameraReader" className="w-full h-full mb-10"  style={{transform: `${isFlip ? "scaleX(-100%) scaleY(-100%)" : ""}`}}/>
                <div className='flex w-full absolute top-0 right-0 justify-between p-10'>
                  <Icon icono={"camera-rotate"} onClick={flipCamera}/>
                  <Icon icono={"circle-xmark"}  onClick={stopScanner}/>
                </div>
              </div>
            </div>
          </div>
          ,document.getElementById("modalUnico")
        )
      )}
    </>
  );
};

export default QrReader;
