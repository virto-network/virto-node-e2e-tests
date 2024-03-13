import { ApiPromise, WsProvider } from "@polkadot/api";
import { ALICE, BOB, TREASURY } from "../../lib/keyring.js";
import { signTxSendAndWait } from "../../lib/tx-send.js";
import assert from "node:assert";

let api = await ApiPromise.create({
  provider: new WsProvider(
    process.env.CHAIN_ENDPOINT ?? "ws://localhost:20000"
  ),
});

await api.isReady;

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

const createMembership1 = api.tx.communityMemberships.forceMint(
  0,
  api.createType("MembershipId", [communityId, BigInt(1)]),
  TREASURY.address,
  {}
);
const createMembership2 = api.tx.communityMemberships.forceMint(
  0,
  api.createType("MembershipId", [communityId, BigInt(2)]),
  TREASURY.address,
  {}
);

await signTxSendAndWait.withLogs(
  api.tx.sudo.sudo(
    api.tx.utility.batchAll([
      createCommunity,
      createMembership1,
      createMembership2,
    ])
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

const approveReceiveMembership = api.tx.communityMemberships.transfer(
  0,
  api.createType("MembershipId", [communityId, BigInt(1)]),
  TREASURY.address
);

await signTxSendAndWait.withLogs(
  api.tx.sudo.sudoAs(BOB.address, approveReceiveMembership),
  ALICE
);

const transferMembership = api.tx.communityMemberships.transfer(
  0,
  api.createType("MembershipId", [communityId, BigInt(1)]),
  BOB.address
);

await signTxSendAndWait.withLogs(
  api.tx.sudo.sudoAs(TREASURY.address, transferMembership),
  ALICE
);

const setMembersCount = api.tx.system.setStorage([
  [api.query.communities.communityMembersCount.key(1), "0x01000000"],
]);

await signTxSendAndWait.withLogs(api.tx.sudo.sudo(setMembersCount), ALICE);

assert.equal(await api.query.communities.communityMembersCount(1), 1);

await api.disconnect();
