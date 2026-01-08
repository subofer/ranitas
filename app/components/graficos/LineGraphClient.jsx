import dynamic from 'next/dynamic';
const LineChart_ = dynamic(() => import('./LineGraph'), { ssr: false });

const DefaultComponent = () => (
  <div>Loading...</div>
)

export const LineChart = LineChart_ || DefaultComponent;