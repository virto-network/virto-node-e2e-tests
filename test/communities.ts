import assert from "node:assert";
import { after, before, describe, it } from "node:test";

import { ApiPromise } from "@polkadot/api";
import { Option, Tuple } from "@polkadot/types";
import { PalletNftsItemDetails } from "@polkadot/types/lookup";

import { signTxSendAndWait } from "../lib/tx-send.js";
import { ALICE, TREASURY } from "../lib/keyring.js";
import { KreivoE2ERuntime } from "../lib/kreivo-e2e-runtime.js";

describe("Communities", async () => {
  let api: ApiPromise;
  let kreivoE2ERuntime: KreivoE2ERuntime;

  before(async () => {
    kreivoE2ERuntime = await new KreivoE2ERuntime().initialize();
    api = kreivoE2ERuntime.api;

    const createMembershipManagerCollection =
      api.tx.communityMemberships.forceCreate(TREASURY.address, {});
    await signTxSendAndWait(
      api.tx.sudo.sudo(createMembershipManagerCollection),
      ALICE
    );

    await signTxSendAndWait(
      api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(TREASURY.address, 2 ** 53 - 1)
      ),
      ALICE
    );

    api.registerTypes({
      CommunityId: {
        0: "u16",
      },
      MembershipId: {
        0: "CommunityId",
        1: "u32",
      },
      MembershipInfo: {
        id: "MembershipId",
        rank: "u32",
      },
    });
  });

  it("can create a membership", async () => {
    const createMembership = api.tx.communityMemberships.forceMint(
      0,
      [1, 1],
      TREASURY.address,
      {}
    );

    await signTxSendAndWait(api.tx.sudo.sudo(createMembership), ALICE);

    const membership = await api.query.communityMemberships.item(0, [1, 1]);
    assert.equal(
      (membership.toPrimitive() as unknown as PalletNftsItemDetails).owner,
      TREASURY.address
    );
  });

  it("can set membershipInfo on an existing membership", async () => {
    const membershipInfo = api.createType("MembershipInfo", {
      id: api.createType("MembershipId", [
        api.createType("CommunityId", [BigInt(1)]),
        BigInt(1),
      ]),
      rank: BigInt(0),
    });

    const initializeMembership = api.tx.communityMemberships.forceSetAttribute(
      null,
      0,
      [1, 1],
      "Pallet",
      "membership",
      membershipInfo.toHex()
    );

    await signTxSendAndWait(api.tx.sudo.sudo(initializeMembership), ALICE);

    const membershipAttribute: Option<Tuple> =
      (await api.query.communityMemberships.attribute(
        0,
        [1, 1],
        "Pallet",
        "membership"
      )) as unknown as Option<Tuple>;

    let attributeValue = membershipAttribute.unwrap()[0].toHex();

    assert.equal(attributeValue, membershipInfo.toHex());
  });

  after(() => kreivoE2ERuntime.close());
});

// import { WsProvider } from "@polkadot/api";
// import { ApiPromise } from "@polkadot/api";

// import { SubmittableExtrinsic } from "@polkadot/api/types";

// const api = await ApiPromise.create({
//   provider,
//   types: {
//     CommunityId: {
//       0: "u32",
//     },
//     MembershipId: {
//       0: "CommunityId",
//       1: "u32",
//     },
//     Rank: "u32",
//     MembershipInfo: {
//       id: "MembershipId",
//       rank: "Rank",
//     },
//   },
// });

// // const createMembershipCollection = api.tx.communityMemberships.forceCreate(
// //   treasury.address,
// //   {}
// // );

// // await signTxSendAndWait(api.tx.sudo.sudo(createMembershipCollection), ALICE);

// const communityId = api.createType("CommunityId", [1]);

// const createMembership1 = api.tx.communityMemberships.forceMint(
//   0,
//   api.createType("MembershipId", [communityId, 1]).toHex(),
//   treasury.address,
//   {}
// );
// const createMembership2 = api.tx.communityMemberships.forceMint(
//   0,
//   api.createType("MembershipId", [communityId, 2]).toHex(),
//   treasury.address,
//   {}
// );

// await signTxSendAndWait(
//   api.tx.sudo.sudo(
//     api.tx.utility.batchAll([createMembership1, createMembership2])
//   ),
//   ALICE
// );

// const initializeMembership1 = api.tx.communityMemberships.forceSetAttribute(
//   null,
//   0,
//   api.createType("MembershipId", [communityId, 1]).toHex(),
//   api.createType("PalletNftsAttributeNamespace", "Pallet").toHex(),
//   api.createType("Vec<u8>", "membership").toHex(),
//   api.createType("MembershipInfo").toHex()
// );

// const initializeMembership2 = api.tx.communityMemberships.forceSetAttribute(
//   null,
//   0,
//   api.createType("MembershipId", [communityId, 2]).toHex(),
//   api.createType("PalletNftsAttributeNamespace", "Pallet").toHex(),
//   api.createType("Vec<u8>", "membership").toHex(),
//   api.createType("MembershipInfo").toHex()
// );

// await signTxSendAndWait(
//   api.tx.sudo.sudo(
//     api.tx.utility.batchAll([initializeMembership1, initializeMembership2])
//   ),
//   ALICE
// );
