export default {
  chain: {
    endpoint: process.env.CHAIN_ENDPOINT ?? "wss://kreivo.io/",
  },
  runtime: {
    wasmFilepath:
      process.env.WASM_FILEPATH ??
      `${process.cwd()}/kreivo_runtime.compact.compressed.wasm`,
  },
};
