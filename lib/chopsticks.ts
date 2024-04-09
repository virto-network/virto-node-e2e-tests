import {
  Blockchain,
  BuildBlockMode,
  ChopsticksProvider,
  setup,
  setupWithServer,
} from "@acala-network/chopsticks";
import { ApiPromise } from "@polkadot/api";
import config from "./config.js";

export class ChopsticksClient {
  constructor(private endpoint = config.chain.endpoint) {}

  private chain?: Blockchain;
  private provider?: ChopsticksProvider;
  #api?: ApiPromise;

  async initialize(withServer = false) {
    if (!withServer) {
      this.chain = await setup({
        buildBlockMode: BuildBlockMode.Instant,
        endpoint: this.endpoint,
      });
    } else {
      const { chain } = await setupWithServer({
        "build-block-mode": BuildBlockMode.Instant,
        endpoint: this.endpoint,
        port: 8000,
      });

      this.chain = chain;
    }

    const provider = new ChopsticksProvider(this.chain);
    this.provider = provider;

    this.#api = new ApiPromise({ provider });
    await this.#api.isReady;

    return this;
  }

  async close() {
    await this.api?.disconnect();
    await this.provider?.disconnect();

    await this.chain?.db?.close();
    await this.chain?.api?.disconnect();
    await this.chain?.close();
  }

  get api() {
    return this.#api!;
  }

  get blockchain() {
    return this.chain!;
  }
}
