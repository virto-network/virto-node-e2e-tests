import { u8aToHex, hexToU8a } from "@polkadot/util";
import { encodeAddress } from "@polkadot/util-crypto";
import { type Codec } from "@polkadot/types/types";

export function communityAccountFor(communityId: Codec): string {
  // modlkv/cmtys
  const rawAccount = new Uint8Array([
    ...[0x6d, 0x6f, 0x64, 0x6c, 0x6b, 0x76, 0x2f, 0x63, 0x6d, 0x74, 0x79, 0x73],
    ...communityId.toU8a(true),
  ]);

  const accountIdRaw = hexToU8a(u8aToHex(rawAccount).padEnd(66, "0"));

  return encodeAddress(accountIdRaw, 2);
}
