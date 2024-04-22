import { useState, useEffect } from 'react';

export default function useDeviceAndProtocol() {
  const [result, setResult] = useState({userAgent:"", protocol:""})

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const protocol = window.location.protocol;
    console.log(protocol)
    setResult((prev) => ({
      protocol,
      isHttps: protocol == "https",
      userAgent: userAgent,
      isMobile: /iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(userAgent),
    }))
  }, []);

  return result;
}
