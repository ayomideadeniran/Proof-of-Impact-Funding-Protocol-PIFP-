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

        // 2. Resource Bounds (Bypassing failing auto-estimation for V3)
        // Sepolia requires non-zero l1_data_gas and a competitive l1_gas price.
        // Total max fee: (100k + 1k) * 10 Gwei = 0.00101 ETH (safe within 0.002 ETH balance)
        const resourceBounds = {
            l1_gas: { 
                max_amount: "0x186a0",         // 100,000 gas 
                max_price_per_unit: "0x2540be400" // 10 Gwei (very safe for Sepolia)
            },
            l2_gas: { max_amount: "0x0", max_price_per_unit: "0x0" },
            l1_data_gas: { 
                max_amount: "0x3e8",           // 1,000 gas
                max_price_per_unit: "0x2540be400" // 10 Gwei
            }
        };

        console.log("Using robust V3 bounds:", JSON.stringify(resourceBounds));

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
