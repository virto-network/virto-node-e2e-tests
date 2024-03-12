import { SubmittableExtrinsic } from "@polkadot/api/types";
import { KeyringPair } from "@polkadot/keyring/types";

export function signTxSendAndWait(
  tx: SubmittableExtrinsic<"promise">,
  signer: KeyringPair
) {
  // console.log(`[${signer.address}] is submitting`, tx.args?.at(0)?.toHuman());

  return new Promise<void>(async (resolve) => {
    const unsub = await tx.signAndSend(signer, (result) => {
      // console.log(`Current status is ${result.status}`);

      if (result.status.isInBlock) {
        // console.log(
        //   `Transaction included at blockHash ${result.status.asInBlock}`
        // );
      } else if (result.status.isFinalized) {
        // console.log(
        //   `Transaction finalized at blockHash ${result.status.asFinalized}`
        // );

        unsub();
        resolve();
      }
    });
  });
}
