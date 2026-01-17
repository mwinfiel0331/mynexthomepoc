// Main export: default to mock, but allow override
export { MockListingsProvider, MockNeighborhoodSignalsProvider, MockMarketSignalsProvider, MockCommuteTimeProvider, getListingsProvider, getNeighborhoodSignalsProvider, getMarketSignalsProvider, getCommuteTimeProvider } from './mock';

// Export real adapters (skeletal) for documentation purposes
export {
  RealListingsProvider,
  RealNeighborhoodSignalsProvider,
  RealMarketSignalsProvider,
  RealCommuteTimeProvider,
} from './real';
