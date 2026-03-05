const ZERO_ADDRESS = /^0x0+$/i;

export function getPifpContractAddress(): string {
    const address = process.env.NEXT_PUBLIC_PIFP_CONTRACT_ADDRESS?.trim();

    if (!address) {
        throw new Error(
            "Missing NEXT_PUBLIC_PIFP_CONTRACT_ADDRESS. Add it to frontend/.env.local and restart the dev server."
        );
    }

    if (!address.startsWith("0x") || ZERO_ADDRESS.test(address)) {
        throw new Error(
            "Invalid NEXT_PUBLIC_PIFP_CONTRACT_ADDRESS. It must be a deployed Starknet contract address (not 0x0)."
        );
    }

    return address;
}

export function getPifpTokenAddress(): string {
    const address = process.env.NEXT_PUBLIC_PIFP_TOKEN_ADDRESS?.trim();

    if (!address) {
        throw new Error(
            "Missing NEXT_PUBLIC_PIFP_TOKEN_ADDRESS. Add token address to frontend/.env.local and restart."
        );
    }

    if (!address.startsWith("0x") || ZERO_ADDRESS.test(address)) {
        throw new Error(
            "Invalid NEXT_PUBLIC_PIFP_TOKEN_ADDRESS. It must be a deployed ERC20 token address (not 0x0)."
        );
    }

    return address;
}
