import { ALICE, TREASURY } from "../../lib/keyring.js";
import { signTxSendAndWait } from "../../lib/tx-send.js";
import { communityAccountFor } from "../../lib/helpers.js";
import { KreivoE2ERuntime } from "../../lib/kreivo-e2e-runtime.js";

import { u128, u32 } from "@polkadot/types";

// Connect to upgraded provider
const { api } = await new KreivoE2ERuntime().initialize(true);

api.registerTypes({
  CommunityId: "u16",
  MembershipId: "u32",
});

// ======= Seed Parameters =======
const virtoCommunityId = api.createType("CommunityId", BigInt(1));
const adminOrigin = {
  Communities: {
    communityId: virtoCommunityId,
  },
};

const OLANOD = "EvoLanodoqDsgHb98Ymbu41uXXKfCPDKxeM6dXHyJ2JoVus";
const PANDRES95 = "HUf7Nvfhp85yFZm31zV2ux8h1946Bzzmos2jqGGhp3bWXD4";
const S0C5 = "CzbcJ48jKNoh9Kiubw7e5Y2Ur1XggipLVfmnnQxpFTbvCU3";

const seedMembers = [OLANOD, PANDRES95, S0C5];

const membershipsManagerAccount = TREASURY.address;
const virtoCommunityAccount = communityAccountFor(virtoCommunityId);

// ======= Mint Deposits for Storing Memberships =======
const numberOfMemberships = 10;

const collectionDeposit = (
  api.consts.communityMemberships.collectionDeposit as u128
).toNumber();

// Deposit for storing the collection attribute 'membership_member_count' (u32)
const communityMemberCountDeposit =
  (api.consts.communityMemberships.attributeDepositBase as u128).toNumber() +
  (api.consts.communityMemberships.depositPerByte as u128).toNumber() * 27;

// Deposit for storing a membership item
const membershipDeposit =
  0 + (api.consts.communityMemberships.itemDeposit as u128).toNumber();

// Deposit for storing the item attribute 'membership_member_rank' (u32)
const membershipRankDeposit =
  (api.consts.communityMemberships.attributeDepositBase as u128).toNumber() +
  (api.consts.communityMemberships.depositPerByte as u128).toNumber() * 26;

const mintDepositsForMembershipsManagerAccount =
  api.tx.balances.forceSetBalance(
    membershipsManagerAccount,
    (() => {
      return collectionDeposit + numberOfMemberships * membershipDeposit;
    })()
  );

const mintDepositsForVirtoCommunityAccount = api.tx.balances.forceSetBalance(
  virtoCommunityAccount,
  (() => {
    return (
      collectionDeposit +
      communityMemberCountDeposit +
      numberOfMemberships * (membershipDeposit + membershipRankDeposit)
    );
  })()
);

// ======= Create Memberships Manager Collections, then mint Memberships claimable by Community =======

const createManagerMembershipsCollection =
  api.tx.communityMemberships.forceCreate(membershipsManagerAccount, {});

const mintClaimableMemberships = [];
for (let i = 0; i < numberOfMemberships - seedMembers.length; i++) {
  mintClaimableMemberships.push(
    api.tx.communityMemberships.forceMint(
      0,
      seedMembers.length + i,
      virtoCommunityAccount,
      {}
    )
  );
}

// ======= Create Community Memberships Collection, mint memberships for seed members =======

const createVirtoMembershipsCollection =
  api.tx.communityMemberships.forceCreate(virtoCommunityAccount, {});

const mintMembershipsIntoVirto = [];
for (const i in seedMembers) {
  mintMembershipsIntoVirto.push(
    api.tx.communityMemberships.forceMint(1, i, seedMembers[i], {})
  );
}

const setMemberCountIntoVirto = api.tx.communityMemberships.forceSetAttribute(
  null,
  1,
  null,
  { Pallet: null },
  "membership_member_count",
  api.createType("MembershipId", BigInt(seedMembers.length)).toHex()
);

// ======= Create Community, set decision method, set metadata =======

const createCommunity = api.tx.communities.create(
  adminOrigin,
  virtoCommunityId
);

const setCommunityDecisionMethod = api.tx.communities.setDecisionMethod(
  virtoCommunityId,
  "Membership"
);

const setCommunityMetadata = api.tx.communities.setMetadata(
  virtoCommunityId,
  "Virto",
  "Payments infrastructure for impactful communities",
  "https://virto.network"
);

// ======= Create community track =======

const createCommunityTrack = api.tx.communityTracks.insert(
  virtoCommunityId,
  {
    name: "Virto Network".padEnd(25, " "),
    maxDeciding: 1,
    decisionDeposit: 1,
    preparePeriod: 1,
    decisionPeriod: 1,
    confirmPeriod: 1,
    minEnactmentPeriod: 1,
    minApproval: {
      LinearDecreasing: {
        length: 1e9, // 100%
        ceil: 1e9, // 100%
        floor: 5e8, // 50%
      },
    },
    minSupport: {
      LinearDecreasing: {
        length: 1e9, // 100%
        ceil: 5e8, // 50%
        floor: 0, // 0%
      },
    },
  },
  adminOrigin
);

// ======= Build seedling extrinsic =======

const seedling = api.tx.sudo.sudo(
  api.tx.utility.batch([
    // On CommunityMemberships
    mintDepositsForMembershipsManagerAccount,
    mintDepositsForVirtoCommunityAccount,
    createManagerMembershipsCollection,
    ...mintClaimableMemberships,
    createVirtoMembershipsCollection,
    ...mintMembershipsIntoVirto,
    setMemberCountIntoVirto,
    // On Communities
    createCommunity,
    setCommunityDecisionMethod,
    setCommunityMetadata,
    // On CommunityTracks
    createCommunityTrack,
  ])
);

await signTxSendAndWait.withLogs(seedling, ALICE);

console.log(
  `Virto seedling:
  %s`,
  seedling.toHex()
);
