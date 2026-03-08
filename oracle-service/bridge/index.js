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
        console.log("Fetching nonce (latest)...");
        const nonce = await provider.getNonceForAddress(accountAddress, "latest");
        console.log(`Using nonce: ${nonce}`);

        // Manually specify resource bounds to bypass library/node estimation bugs regarding l1_data_gas
        // These are safe high-end defaults for simple contract calls
        const resourceBounds = {
            l1_gas: { max_amount: "0x186a0", max_price_per_unit: "0x10000000000" }, // 100k gas, 100 Gwei
            l2_gas: { max_amount: "0x0", max_price_per_unit: "0x0" },
            l1_data_gas: { max_amount: "0x0", max_price_per_unit: "0x0" }
        };

        const { transaction_hash } = await account.execute(
            {
                contractAddress,
                entrypoint,
                calldata
            },
            {
                version: 3,
                nonce,
                resourceBounds, // Provide parameters manually to avoid failing "estimateFee"
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
