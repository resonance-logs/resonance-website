// Optimization history API has been deprecated on the frontend.
// If you need to call history endpoints from the frontend, please create a new API wrapper.
export function getOptimizationHistory() {
  throw new Error('getOptimizationHistory is deprecated and was removed from the frontend.');
}
export function getOptimizationResult() {
  throw new Error('getOptimizationResult is deprecated and was removed from the frontend.');
}
export function deleteOptimizationResult() {
  throw new Error('deleteOptimizationResult is deprecated and was removed from the frontend.');
}
