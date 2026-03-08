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

function isInvalidSignatureError(message) {
    return message.includes("Account: invalid signature");
}

async function resolveSupportedBlockTag(provider, accountAddress) {
    try {
        await provider.getNonceForAddress(accountAddress, "pending");
        return "pending";
    } catch (error) {
        const message = error?.message || String(error);
        if (message.includes("Invalid block id")) {
            console.warn(`Pending block tag unsupported, falling back to latest: ${message}`);
            return "latest";
        }
        throw new Error(`RPC connectivity check failed while probing pending nonce: ${message}`);
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
    const rpcUrl = process.env.ORACLE_RPC_URL;
    const accountAddress = process.env.ORACLE_ACCOUNT_ADDRESS;
    const privateKey = process.env.ORACLE_PRIVATE_KEY;
    const contractAddress = process.env.ORACLE_PIFP_CONTRACT_ADDRESS;

    if (!rpcUrl || !accountAddress || !privateKey || !contractAddress) {
        console.error("Missing environment variables (ORACLE_RPC_URL, ORACLE_ACCOUNT_ADDRESS, ORACLE_PRIVATE_KEY, ORACLE_PIFP_CONTRACT_ADDRESS)");
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
        // 2. Resource Bounds Strategy
        let resourceBounds;
        try {
            console.log("Estimating V3 fee with validation enabled...");
            const estimate = await account.estimateInvokeFee(call, {
                version: constants.TRANSACTION_VERSION.V3,
                nonce,
                blockIdentifier: blockTag,
                skipValidate: false,
                resourceBounds: zeroResourceBounds(),
            });
            resourceBounds = padResourceBounds(estimate.resourceBounds);
            console.log("Estimation success. Using padded V3 bounds:", JSON.stringify(resourceBounds));
        } catch (e) {
            const message = e?.message || String(e);
            if (isInvalidSignatureError(message)) {
                throw new Error(`Signer validation failed during fee estimation: ${message}`);
            }
            console.warn("Estimation failed, using robust fallback bounds:", message);
            // Definitively resolve "missing field: l1_data_gas" and "Error 53" (minimal fee)
            // Total max fee: (500k + 10k) * 2 Gwei ≈ 0.001 ETH (Safe for 0.002 ETH balance)
            resourceBounds = {
                l1_gas: { 
                    max_amount: "0x7a120",         // 500,000 gas (covers Argent validation)
                    max_price_per_unit: "0x77359400" // 2 Gwei
                },
                l2_gas: { max_amount: "0x0", max_price_per_unit: "0x0" },
                l1_data_gas: { 
                    max_amount: "0x2710",          // 10,000 gas (Mandatory non-zero)
                    max_price_per_unit: "0x77359400" // 2 Gwei
                }
            };
            console.log("Using Economy-Scale fallback bounds:", JSON.stringify(resourceBounds));
        }

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
        const message = error?.message || String(error);
        console.error("Execution failed:", message);
        if (message.includes("fetch failed")) {
            console.error(`Bridge diagnosis: ORACLE_RPC_URL is unreachable or invalid: ${rpcUrl}`);
        }
        if (isInvalidSignatureError(message)) {
            console.error("Bridge diagnosis: ORACLE_ACCOUNT_ADDRESS and ORACLE_PRIVATE_KEY do not match this Starknet account, or the account type requires a different signer setup.");
        }
        process.exit(1);
    }
}

main();
