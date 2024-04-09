import assert from "node:assert";
import { readFile } from "node:fs/promises";

import { u8aToHex } from "@polkadot/util";

import { ChopsticksClient } from "./chopsticks.js";
import { ALICE } from "./keyring.js";
import { signTxSendAndWait } from "./tx-send.js";
import config from "./config.js";
import { encodeAddress } from "@polkadot/keyring";
import { blake2b } from "hash-wasm";

export class KreivoE2ERuntime extends ChopsticksClient {
  async initialize(withServer = false) {
    await super.initialize(withServer);

    await this.overrideSudo();
    await this.runRuntimeUpgrade();

    return this;
  }

  async overrideSudo(sudo = ALICE) {
    const systemAccountForAlice = this.api.query.system.account.key(
      sudo.address
    );
    const sudoKeyStorageKey = this.api.query.sudo.key.key();

    const block = await this.blockchain.newBlock();
    block.pushStorageLayer().setAll({
      [sudoKeyStorageKey]: u8aToHex(sudo.addressRaw),
      [systemAccountForAlice]: this.api
        .createType("FrameSystemAccountInfo", {
          providers: 1,
          data: {
            free: 1e15,
          },
        })
        .toHex(),
    });

    assert.strictEqual(
      (await this.api.query.sudo.key()).toHex(),
      u8aToHex(sudo.addressRaw)
    );

    assert.strictEqual(
      (await this.api.query.system.account(sudo.address)).data.free.toNumber(),
      1e15
    );

    console.log("[KreivoE2ERuntime] Sudo overriden");
    console.log(
      "\tSudo::Key (%s): %s (%s)",
      this.api.query.sudo.key.key(),
      encodeAddress((await this.api.query.sudo.key()).toHex(), 2),
      (await this.api.query.sudo.key()).toHex()
    );
    console.log(
      "\tSystem::Account(%s) (%s): %j",
      encodeAddress((await this.api.query.sudo.key()).toHex(), 2),
      this.api.query.system.account.key(sudo.address),
      (await this.api.query.system.account(sudo.address)).toHuman()
    );
  }

  async runRuntimeUpgrade(sudo = ALICE) {
    const lastRuntimeUpgrade = (
      await this.api.query.system.lastRuntimeUpgrade()
    ).unwrap();

    const newWasmRuntime = await readFile(config.runtime.wasmFilepath);
    const hash = await blake2b(newWasmRuntime, 256);

    const authorizeUpgradeCall = this.api.tx.parachainSystem.authorizeUpgrade(
      `0x${hash}`,
      false
    );
    const enactAuthorizedUpgradeCall =
      this.api.tx.parachainSystem.enactAuthorizedUpgrade(
        u8aToHex(newWasmRuntime)
      );
    await signTxSendAndWait(this.api.tx.sudo.sudo(authorizeUpgradeCall), sudo);
    await signTxSendAndWait(enactAuthorizedUpgradeCall, sudo);

    await this.blockchain.newBlock();
    await this.blockchain.newBlock();

    const thisRuntimeUpgrade = (
      await this.api.query.system.lastRuntimeUpgrade()
    ).unwrap();

    assert(
      thisRuntimeUpgrade.specVersion.toNumber() >
        lastRuntimeUpgrade.specVersion.toNumber()
    );
  }
}
