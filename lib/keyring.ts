import { Keyring } from "@polkadot/api";
import { waitReady } from "@polkadot/wasm-crypto";

await waitReady();

const keyring = new Keyring({ ss58Format: 2, type: "sr25519" });

export const ALICE = keyring.createFromUri("//Alice");
export const BOB = keyring.createFromUri("//Bob");
export const TREASURY = keyring.addFromAddress(
  "F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29"
);
