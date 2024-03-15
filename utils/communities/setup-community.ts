import { ApiPromise, WsProvider } from "@polkadot/api";
import { ALICE, BOB, TREASURY } from "../../lib/keyring.js";
import { signTxSendAndWait } from "../../lib/tx-send.js";
import assert from "node:assert";

import { u8aToHex, hexToU8a } from "@polkadot/util";
import { encodeAddress } from "@polkadot/util-crypto";
import { Codec } from "@polkadot/types/types";

let api = await ApiPromise.create({
  provider: new WsProvider(process.env.CHAIN_ENDPOINT ?? "ws://localhost:8000"),
});

await api.isReady;

function communityAccountFor(communityId: Codec): string {
  // modlkv/cmtys
  const rawAccount = new Uint8Array([
    ...[0x6d, 0x6f, 0x64, 0x6c, 0x6b, 0x76, 0x2f, 0x63, 0x6d, 0x74, 0x79, 0x73],
    ...communityId.toU8a(),
  ]);

  const accountIdRaw = hexToU8a(u8aToHex(rawAccount).padEnd(66, "0"));

  return encodeAddress(accountIdRaw, 2);
}

const createMembershipCollection = api.tx.communityMemberships.forceCreate(
  TREASURY.address,
  {}
);

await signTxSendAndWait.withLogs(
  api.tx.sudo.sudo(createMembershipCollection),
  ALICE
);

await signTxSendAndWait.withLogs(
  api.tx.sudo.sudo(
    api.tx.balances.forceSetBalance(TREASURY.address, 2 ** 53 - 1)
  ),
  ALICE
);

api.registerTypes({
  CommunityId: "(u16)",
  MembershipId: "(CommunityId, u32)",
  MembershipInfo: {
    id: "MembershipId",
    rank: "u32",
  },
});

const communityId = api.createType("CommunityId", [BigInt(1)]);
const adminOrigin = {
  Communities: {
    communityId: 1,
    method: "Membership",
    subset: null,
  },
};

const createCommunity = api.tx.communities.create(adminOrigin, communityId);

await signTxSendAndWait.withLogs(api.tx.sudo.sudo(createCommunity), ALICE);

const createCommunityTrack = api.tx.communityTracks.insert(
  1,
  {
    name: api.createType("[u8; 25]", "Virto Network".padEnd(25, " ")),
    maxDeciding: 1,
    decisionDeposit: 1,
    preparePeriod: 1,
    decisionPeriod: 1,
    confirmPeriod: 1,
    minEnactmentPeriod: 1,
    minApproval: api.createType("PalletReferendaCurve", {
      LinearDecreasing: {
        length: 1e9,
        ceil: 1e9,
        floor: 5e8,
      },
    }),
    minSupport: api.createType("PalletReferendaCurve", {
      LinearDecreasing: {
        length: 1e9,
        ceil: 5e8,
        floor: 0,
      },
    }),
  },
  adminOrigin
);

await signTxSendAndWait.withLogs(api.tx.sudo.sudo(createCommunityTrack), ALICE);

const createMembership1 = api.tx.communityMemberships.forceMint(
  0,
  api.createType("MembershipId", [communityId, BigInt(1)]),
  communityAccountFor(communityId),
  {}
);
const createMembership2 = api.tx.communityMemberships.forceMint(
  0,
  api.createType("MembershipId", [communityId, BigInt(2)]),
  communityAccountFor(communityId),
  {}
);

await signTxSendAndWait.withLogs(
  api.tx.sudo.sudo(
    api.tx.utility.batchAll([createMembership1, createMembership2])
  ),
  ALICE
);

const initializeMembership1 = api.tx.communityMemberships.forceSetAttribute(
  null,
  0,
  api.createType("MembershipId", [communityId, BigInt(1)]),
  "Pallet",
  "membership",
  api.createType("MembershipInfo").toHex()
);

const initializeMembership2 = api.tx.communityMemberships.forceSetAttribute(
  null,
  0,
  api.createType("MembershipId", [communityId, 2]).toHex(),
  api.createType("PalletNftsAttributeNamespace", "Pallet").toHex(),
  api.createType("Vec<u8>", "membership").toHex(),
  api.createType("MembershipInfo").toHex()
);

await signTxSendAndWait.withLogs(
  api.tx.sudo.sudo(
    api.tx.utility.batchAll([initializeMembership1, initializeMembership2])
  ),
  ALICE
);

const setCommunityMetadata = api.tx.communities.setMetadata(
  communityId,
  "Virto",
  "Payments infrastructure for impactful communities",
  "https://virto.network"
);

const setCommunityDecisionMethod = api.tx.communities.setDecisionMethod(
  communityId,
  "Membership"
);

await signTxSendAndWait.withLogs(
  api.tx.sudo.sudo(
    api.tx.utility.batchAll([setCommunityMetadata, setCommunityDecisionMethod])
  ),
  ALICE
);

const addMember = api.tx.sudo.sudoAs(
  communityAccountFor(communityId),
  api.tx.communities.addMember(BOB.address)
);

await signTxSendAndWait.withLogs(addMember, ALICE);

assert.equal(await api.query.communities.communityMembersCount(1), 1);

await api.disconnect();
