import assert from "node:assert";
import { after, before, describe, it } from "node:test";

import { ApiPromise } from "@polkadot/api";
import { u8aToHex } from "@polkadot/util";

import { ChopsticksClient } from "../lib/chopsticks.js";
import { ALICE } from "../lib/keyring.js";
import { decodeAddress, encodeAddress } from "@polkadot/keyring";

describe("Chain", () => {
  let api: ApiPromise;
  let chopsticksClient: ChopsticksClient;

  before(async () => {
    chopsticksClient = await new ChopsticksClient(
      process.env.CHAIN_ENDPOINT_LIVE ?? "wss://kreivo.kippu.rocks/"
    ).initialize();

    api = chopsticksClient.api;
  });

  it("Can set the sudo key", async () => {
    const sudoKeyStorageKey = api.query.sudo.key.key();

    const block = await chopsticksClient.blockchain.newBlock();
    block.pushStorageLayer().set(sudoKeyStorageKey, u8aToHex(ALICE.addressRaw));

    assert.equal(
      (await api.query.sudo.key()).toHex(),
      u8aToHex(ALICE.addressRaw)
    );
  });

  it("Can successfully execute a runtime upgrade", () => {
    // TODO: implement runtime upgrade
    // chopsticksClient.blockchain.upcomingBlocks();
  });

  after(() => chopsticksClient.close());
});
