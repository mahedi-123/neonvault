const stamp = () => new Date().toISOString().slice(11, 19);
export const log = {
  info: (...a) => console.log(`[${stamp()}]`, ...a),
  warn: (...a) => console.warn(`[${stamp()}] WARN`, ...a),
  error: (...a) => console.error(`[${stamp()}] ERROR`, ...a),
  quiet: { info() {}, warn() {}, error: (...a) => console.error(...a) },
};
