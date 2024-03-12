import { BuildBlockMode, setupWithServer } from "@acala-network/chopsticks";
import { ApiPromise, WsProvider } from "@polkadot/api";

export class ChopsticksClient {
  private static ports: number[] = [];

  private static selectPort() {
    let port = (this.ports.at(-1) ?? 28000) + 1;
    this.ports.push(port);
    return port;
  }

  constructor(private endpoint = process.env.CHAIN_ENDPOINT) {}

  #close?: () => Promise<void>;
  private provider?: WsProvider;
  #api?: ApiPromise;

  async initialize() {
    const { close, listenPort } = await setupWithServer({
      "build-block-mode": BuildBlockMode.Batch,
      endpoint: this.endpoint,
      block: 1,
      port: ChopsticksClient.selectPort(),
    });

    this.#close = close;

    const provider = new WsProvider(`ws://localhost:${listenPort}`);

    // await tryConnectProvider(provider);
    this.provider = provider;

    this.#api = new ApiPromise({ provider });
    await tryConnectApi(this.#api);

    return this;
  }

  async close() {
    await this.api?.disconnect();
    await this.provider?.disconnect();
    await this.#close?.();
  }

  get api() {
    return this.#api!;
  }
}

/**
 *
 * @param  provider The provider to attempt connection from
 * @returns It resolves
 */
export function tryConnectProvider(provider: WsProvider) {
  // any error is 'out of context' in the handler and does not stop the `await provider.isReady`
  // provider.on('connected | disconnected | error')
  // https://github.com/polkadot-js/api/issues/5249#issue-1392411072
  return new Promise<void>((resolve, reject) => {
    provider.on("disconnected", reject);
    provider.on("error", reject);
    provider.on("connected", () => resolve());

    provider.connect();
  });
}

/**
 *
 * @param  api The API to try connect to
 * @returns It resolves if connection is successful, rejects otherwise
 * (also, disconnecting provider)
 */
export function tryConnectApi(api: ApiPromise) {
  return new Promise((resolve, reject) => {
    // api.on("disconnect", async (err) => {
    //   console.error(err);
    //   return reject();
    // });
    api.on("error", async (err) => {
      console.error(err);
      return reject();
    });

    api.isReady.then((api) => {
      return resolve(api);
    });
  });
}
