const { Account, RpcProvider, constants } = require("starknet");

async function main() {
    const entrypoint = process.argv[2];
    const calldata = process.argv.slice(3);

    if (!entrypoint) {
        console.error("Usage: node index.js <entrypoint> <calldata...>");
        process.exit(1);
    }

    const provider = new RpcProvider({ nodeUrl: process.env.ORACLE_RPC_URL });
    const accountAddress = process.env.ORACLE_ACCOUNT_ADDRESS;
    const privateKey = process.env.ORACLE_PRIVATE_KEY;
    const contractAddress = process.env.ORACLE_PIFP_CONTRACT_ADDRESS;

    if (!accountAddress || !privateKey || !contractAddress) {
        console.error("Missing environment variables (ORACLE_ACCOUNT_ADDRESS, ORACLE_PRIVATE_KEY, ORACLE_PIFP_CONTRACT_ADDRESS)");
        process.exit(1);
    }

    const account = new Account(provider, accountAddress, privateKey, "1");

    console.log(`Executing ${entrypoint} on ${contractAddress} with calldata:`, calldata);

    try {
        // 1. Fetch Nonce
        console.log("Fetching nonce (latest)...");
        const nonce = await provider.getNonceForAddress(accountAddress, "latest");
        console.log(`Using nonce: ${nonce}`);

        // 2. Resource Bounds Strategy
        let resourceBounds;
        try {
            console.log("Estimating fee (V3)...");
            // Attempt auto-estimation first for cost efficiency
            // Note: If this fails with "missing field: l1_data_gas", it's a library/node mismatch
            const estimate = await account.estimateInvokeFee(
                [{ contractAddress, entrypoint, calldata }],
                { version: 3, nonce, blockIdentifier: "latest" }
            );

            // Apply a buffer to the estimate
            const gasPrice = BigInt(estimate.gas_price || estimate.resource_bounds?.l1_gas?.max_price_per_unit || "0x3b9aca00"); // Default 1 Gwei
            const gasAmount = BigInt(estimate.gas_consumed || estimate.resource_bounds?.l1_gas?.max_amount || "0x186a0"); // Default 100k

            resourceBounds = {
                l1_gas: {
                    max_amount: "0x" + (gasAmount * 2n).toString(16),
                    max_price_per_unit: "0x" + (gasPrice * 2n).toString(16)
                },
                l2_gas: { max_amount: "0x0", max_price_per_unit: "0x0" },
                l1_data_gas: { max_amount: "0x0", max_price_per_unit: "0x0" }
            };
            console.log("Estimation success. Bounds:", JSON.stringify(resourceBounds));
        } catch (e) {
            console.warn("Estimation failed, using robust fallback bounds:", e.message);
            // These bounds total ~0.0004 ETH, fitting comfortably in 0.002 ETH balance
            resourceBounds = {
                l1_gas: { 
                    max_amount: "0x186a0",         // 100,000 gas (ample for simple invoke)
                    max_price_per_unit: "0xee6b2800" // 4 Gwei (fits standard Sepolia prices)
                },
                l2_gas: { max_amount: "0x0", max_price_per_unit: "0x0" },
                l1_data_gas: { max_amount: "0x0", max_price_per_unit: "0x0" }
            };
        }

        // 3. Execute
        const { transaction_hash } = await account.execute(
            {
                contractAddress,
                entrypoint,
                calldata
            },
            {
                version: 3,
                nonce,
                resourceBounds
            }
        );

        console.log(`Transaction submitted! Hash: ${transaction_hash}`);

        console.log("Waiting for confirmation...");
        const result = await provider.waitForTransaction(transaction_hash);

        if (result.isSuccess()) {
            console.log("SUCCESS");
            console.log(transaction_hash);
            process.exit(0);
        } else {
            console.error("Transaction failed on-chain:", result.finality_status);
            process.exit(1);
        }
    } catch (error) {
        console.error("Execution failed:", error.message);
        process.exit(1);
    }
}

main();
