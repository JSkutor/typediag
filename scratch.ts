import { computePearsonCorrelation } from './src/utils/cylindricalStats';

// Mock data based on transitionChain
const data = [
  { dwell: 20, lat: 100 },
  { dwell: 30, lat: 150 },
  { dwell: 80, lat: 200 },
  { dwell: 120, lat: 250 },
  { dwell: 160, lat: 300 },
  { dwell: 20, lat: 100 },
  { dwell: 30, lat: 150 },
  { dwell: 80, lat: 200 },
  { dwell: 120, lat: 250 },
  { dwell: 160, lat: 300 },
  { dwell: 20, lat: 100 },
];

const nds = data.map(d => (d.lat - d.dwell) / (d.lat + d.dwell));
const lats = data.map(d => d.lat);

const res = computePearsonCorrelation(nds, lats);
console.log(res);
