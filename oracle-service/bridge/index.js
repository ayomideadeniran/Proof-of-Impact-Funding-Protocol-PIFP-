const { Account, RpcProvider, constants } = require("starknet");

function hexToBigInt(value) {
    return BigInt(value);
}

function toHex(value) {
    return `0x${value.toString(16)}`;
}

function scaleHex(hexValue, numerator, denominator) {
    const value = hexToBigInt(hexValue);
    const scaled = (value * BigInt(numerator) + BigInt(denominator) - 1n) / BigInt(denominator);
    return toHex(scaled);
}

function padResourceBounds(resourceBounds, numerator = 3, denominator = 2) {
    return {
        l1_gas: {
            max_amount: scaleHex(resourceBounds.l1_gas.max_amount, numerator, denominator),
            max_price_per_unit: scaleHex(resourceBounds.l1_gas.max_price_per_unit, numerator, denominator),
        },
        l2_gas: {
            max_amount: scaleHex(resourceBounds.l2_gas.max_amount, numerator, denominator),
            max_price_per_unit: scaleHex(resourceBounds.l2_gas.max_price_per_unit, numerator, denominator),
        },
        l1_data_gas: {
            max_amount: scaleHex(resourceBounds.l1_data_gas.max_amount, numerator, denominator),
            max_price_per_unit: scaleHex(resourceBounds.l1_data_gas.max_price_per_unit, numerator, denominator),
        },
    };
}

function zeroResourceBounds() {
    return {
        l1_gas: {
            max_amount: "0x0",
            max_price_per_unit: "0x0",
        },
        l2_gas: {
            max_amount: "0x0",
            max_price_per_unit: "0x0",
        },
        l1_data_gas: {
            max_amount: "0x0",
            max_price_per_unit: "0x0",
        },
    };
}

async function resolveSupportedBlockTag(provider, accountAddress) {
    try {
        await provider.getNonceForAddress(accountAddress, "pending");
        return "pending";
    } catch (error) {
        console.warn(`Pending block tag unsupported, falling back to latest: ${error.message}`);
        return "latest";
    }
}

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
        const blockTag = await resolveSupportedBlockTag(provider, accountAddress);

        // Estimate against the freshest block tag supported by the RPC node.
        console.log(`Fetching nonce (${blockTag})...`);
        const nonce = await provider.getNonceForAddress(accountAddress, blockTag);
        console.log(`Using nonce: ${nonce}`);

        // Include validation in estimation; some account contracts need materially more
        // validation resources than the library's skip-validate default would capture.
        const call = {
            contractAddress,
            entrypoint,
            calldata,
        };
        console.log("Estimating V3 fee with validation enabled...");
        const estimate = await account.estimateInvokeFee(call, {
            version: constants.TRANSACTION_VERSION.V3,
            nonce,
            blockIdentifier: blockTag,
            skipValidate: false,
            resourceBounds: zeroResourceBounds(),
        });
        const resourceBounds = padResourceBounds(estimate.resourceBounds);
        console.log("Estimated V3 bounds:", JSON.stringify(estimate.resourceBounds));
        console.log("Using padded V3 bounds:", JSON.stringify(resourceBounds));

        // 3. Execute
        const { transaction_hash } = await account.execute(
            call,
            {
                version: constants.TRANSACTION_VERSION.V3,
                nonce,
                blockIdentifier: blockTag,
                skipValidate: false,
                resourceBounds,
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
