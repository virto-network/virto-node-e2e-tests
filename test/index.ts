import assert from "node:assert";
import { after, before, describe, it } from "node:test";
import { ChopsticksClient } from "../lib/chopsticks.js";
import { ALICE } from "../lib/keyring.js";

describe("Kreivo", async () => {
  let chopsticksClient: ChopsticksClient;

  before(async () => {
    chopsticksClient = await new ChopsticksClient().initialize();
  });

  it("basic querying works", async () => {
    const aliceAccount = await chopsticksClient.api.query.system.account(
      ALICE.address
    );
    assert.equal(aliceAccount.data.free.toString(), "1152921504606846976");
  });

  after(() => chopsticksClient.close());
});

await import("./communities.js");
