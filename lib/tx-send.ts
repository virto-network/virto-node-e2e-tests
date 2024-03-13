import { SubmittableExtrinsic } from "@polkadot/api/types";
import { KeyringPair } from "@polkadot/keyring/types";

export function signTxSendAndWait(
  tx: SubmittableExtrinsic<"promise">,
  signer: KeyringPair,
  useLogs = false
) {
  if (useLogs) {
    console.log(`[${signer.address}] is submitting`, tx.args?.at(0)?.toHuman());
  }

  return new Promise<void>(async (resolve) => {
    const unsub = await tx.signAndSend(signer, (result) => {
      if (useLogs) {
        console.log(`Current status is ${result.status}`);
      }

      if (result.status.isInBlock) {
        if (useLogs) {
          console.log(
            `Transaction included at blockHash ${result.status.asInBlock}`
          );
        }
      } else if (result.status.isFinalized) {
        if (useLogs) {
          console.log(
            `Transaction finalized at blockHash ${result.status.asFinalized}`
          );
        }

        unsub();
        resolve();
      }
    });
  });
}

signTxSendAndWait.withLogs = (
  tx: SubmittableExtrinsic<"promise">,
  signer: KeyringPair
) => signTxSendAndWait(tx, signer, true);
