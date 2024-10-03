"use server"
import buscarValoresDolar from '@/lib/dolarHoy';
import DolarHoy from './DolarHoy';

const DolarHoyServer = async () => {
  const valores = await buscarValoresDolar()
  return <DolarHoy valores={valores}/>
}

export default DolarHoyServer;