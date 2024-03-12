import {
  BuildBlockMode,
  ChopsticksProvider,
  setup,
} from "@acala-network/chopsticks";
import { ApiPromise } from "@polkadot/api";

export class ChopsticksClient {
  constructor(private endpoint = process.env.CHAIN_ENDPOINT) {}

  private provider?: ChopsticksProvider;
  #api?: ApiPromise;

  async initialize() {
    const chain = await setup({
      buildBlockMode: BuildBlockMode.Batch,
      endpoint: this.endpoint,
      block: 1,
    });

    const provider = new ChopsticksProvider(chain);
    this.provider = provider;

    this.#api = new ApiPromise({ provider });
    await this.#api.isReady;

    return this;
  }

  async close() {
    await this.api?.disconnect();
    await this.provider?.disconnect();
  }

  get api() {
    return this.#api!;
  }
}
