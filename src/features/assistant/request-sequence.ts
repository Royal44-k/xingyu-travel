export function createLatestRequestGate() {
  let latest = 0;
  return {
    start: () => ++latest,
    isLatest: (request: number) => request === latest,
  };
}
