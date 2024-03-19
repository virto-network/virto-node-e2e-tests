import { after, describe } from "node:test";

describe("Kreivo", async () => {
  // await import("./runtime-upgrade.js");
  await import("./communities.js");

  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    process.exit(0);
  });
});
