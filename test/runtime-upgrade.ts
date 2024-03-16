import assert from "node:assert";
import { after, before, describe, it } from "node:test";
import { readFile } from "fs/promises";

import { ApiPromise } from "@polkadot/api";
import { u8aToHex } from "@polkadot/util";

import { ChopsticksClient } from "../lib/chopsticks.js";
import { ALICE } from "../lib/keyring.js";
import { signTxSendAndWait } from "../lib/tx-send.js";

describe("Chain", () => {
  let api: ApiPromise;
  let chopsticksClient: ChopsticksClient;

  before(async () => {
    chopsticksClient = await new ChopsticksClient(
      process.env.CHAIN_ENDPOINT_LIVE ?? "wss://kreivo.kippu.rocks/"
    ).initialize();

    api = chopsticksClient.api;
  });

  it("Can set the sudo key and set some balance to ALICE", async () => {
    const systemAccountForAlice = api.query.system.account.key(ALICE.address);
    const sudoKeyStorageKey = api.query.sudo.key.key();

    const block = await chopsticksClient.blockchain.newBlock();
    block.pushStorageLayer().setAll({
      [sudoKeyStorageKey]: u8aToHex(ALICE.addressRaw),
      [systemAccountForAlice]: api
        .createType("FrameSystemAccountInfo", {
          providers: 1,
          data: {
            free: 1e15,
          },
        })
        .toHex(),
    });

    assert.equal(
      (await api.query.sudo.key()).toHex(),
      u8aToHex(ALICE.addressRaw)
    );

    assert.equal(
      (await api.query.system.account(ALICE.address)).data.free.toNumber(),
      1e15
    );
  });

  it("Can successfully execute a runtime upgrade", async () => {
    const lastRuntimeUpgrade = (
      await api.query.system.lastRuntimeUpgrade()
    ).unwrap();

    const wasmRuntimePath =
      process.env.UPGRADE_RUNTIME_WASM_FILE ??
      `${process.cwd()}/kreivo_runtime.compact.compressed.wasm`;
    const newWasmRuntime = await readFile(wasmRuntimePath);

    const setCodeCall = api.tx.system.setCode(u8aToHex(newWasmRuntime));

    await signTxSendAndWait(api.tx.sudo.sudo(setCodeCall), ALICE);
    await chopsticksClient.blockchain.newBlock();
    await chopsticksClient.blockchain.newBlock();

    const thisRuntimeUpgrade = (
      await api.query.system.lastRuntimeUpgrade()
    ).unwrap();

    assert(
      thisRuntimeUpgrade.specVersion.toNumber() >
        lastRuntimeUpgrade.specVersion.toNumber()
    );
  });

  after(async () => {
    await chopsticksClient.close();
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    process.exit(0);
  });
});
