const sdk = {
  start: () => Promise.resolve(),
};

const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
};

module.exports = {
  sdk,
  logger,
};
