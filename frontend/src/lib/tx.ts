import { RpcProvider } from "starknet";

type TxOutcome = {
    status: "confirmed" | "reverted";
    executionStatus: string;
    finalityStatus: string;
};

type WaitReceipt = {
    execution_status?: string;
    finality_status?: string;
    value?: {
        execution_status?: string;
        finality_status?: string;
    };
    isReverted?: () => boolean;
};

export async function waitForTransactionOutcome(
    provider: RpcProvider,
    txHash: string
): Promise<TxOutcome> {
    const receipt = (await provider.waitForTransaction(txHash, {
        retryInterval: 3000,
        retries: 120
    })) as WaitReceipt;

    const executionStatus = receipt.execution_status ?? receipt.value?.execution_status ?? "UNKNOWN";
    const finalityStatus = receipt.finality_status ?? receipt.value?.finality_status ?? "UNKNOWN";
    const revertedByHelper = typeof receipt.isReverted === "function" ? receipt.isReverted() : false;
    const reverted = revertedByHelper || executionStatus === "REVERTED";

    return {
        status: reverted ? "reverted" : "confirmed",
        executionStatus,
        finalityStatus
    };
}
