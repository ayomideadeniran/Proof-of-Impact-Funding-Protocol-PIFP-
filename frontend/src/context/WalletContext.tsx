"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { connect, disconnect } from "starknetkit";
import { InjectedConnector } from "starknetkit/injected";
import { ArgentMobileConnector } from "starknetkit/argentMobile";
import { WebWalletConnector } from "starknetkit/webwallet";
import { AccountInterface } from "starknet";

type WalletLike = {
    id?: string;
    isConnected?: boolean;
    selectedAddress?: string;
    accountAddress?: string;
    account?: AccountInterface;
    enable?: (options?: { starknetVersion?: string }) => Promise<unknown>;
};

interface WalletContextType {
    connection: WalletLike | null;
    account: AccountInterface | null;
    address: string;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const resolveWalletAddress = (wallet: WalletLike): string => {
    return (
        wallet?.selectedAddress ||
        wallet?.account?.address ||
        wallet?.accountAddress ||
        ""
    );
};

const resolveWalletAccount = (wallet: WalletLike): AccountInterface | null => {
    return wallet?.account || null;
};

export const WalletProvider = ({ children }: { children: ReactNode }) => {
    const [connection, setConnection] = useState<WalletLike | null>(null);
    const [account, setAccount] = useState<AccountInterface | null>(null);
    const [address, setAddress] = useState<string>("");

    useEffect(() => {
        const checkConnection = async () => {
            try {
                const { wallet } = await connect({ modalMode: "neverAsk" }); // Silent connect
                if (!wallet) return;
                const typedWallet = wallet as WalletLike;

                let selectedAddress = resolveWalletAddress(typedWallet);
                if (!selectedAddress && typeof typedWallet.enable === "function") {
                    try {
                        await typedWallet.enable({ starknetVersion: "v5" });
                    } catch {
                        // ignore: user may not have approved yet in silent mode
                    }
                    selectedAddress = resolveWalletAddress(typedWallet);
                }

                if (selectedAddress) {
                    setConnection(typedWallet);
                    setAccount(resolveWalletAccount(typedWallet));
                    setAddress(selectedAddress);
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                // Common when a previously saved connector extension is no longer available.
                if (message.toLowerCase().includes("connector not found")) {
                    await disconnect({ clearLastWallet: true });
                }
                console.warn("Silent wallet auto-connect skipped:", message);
            }
        };
        void checkConnection();
    }, []);

    const connectWallet = async () => {
        try {
            const { wallet } = await connect({
                connectors: [
                    new InjectedConnector({ options: { id: "argentX" } }),
                    new InjectedConnector({ options: { id: "braavos" } }),
                    new WebWalletConnector({ url: "https://web.argent.xyz" }),
                    // @ts-ignore: starknetkit type inconsistency
                    new ArgentMobileConnector()
                ],
                modalMode: "alwaysAsk"
            });

            console.log("Wallet connection attempt result:", wallet);

            if (wallet) {
                const typedWallet = wallet as WalletLike;
                let selectedAddress = resolveWalletAddress(typedWallet);

                // Enable injected wallet if no active account is available yet
                if (!selectedAddress && typeof typedWallet.enable === "function") {
                    try {
                        console.log("Attempting to enable Argent wallet...");
                        await typedWallet.enable({ starknetVersion: "v5" });
                    } catch (e) {
                        console.error("Wallet enable was rejected or failed:", e);
                    }
                }

                selectedAddress = resolveWalletAddress(typedWallet);
                const account = resolveWalletAccount(typedWallet);

                // Some wallet providers return isConnected=false even with a usable selected address.
                if (selectedAddress) {
                    console.log("Wallet connected:", selectedAddress);
                    setConnection(typedWallet);
                    setAccount(account);
                    setAddress(selectedAddress);
                    console.log("Context state updated with address:", selectedAddress);
                } else {
                    console.warn("Wallet connection failed or rejected (no selected address)");
                }
            } else {
                console.warn("Wallet object is null.");
            }
        } catch (e) {
            console.error("Wallet connection error:", e);
        }
    };

    const disconnectWallet = async () => {
        await disconnect({ clearLastWallet: true });
        setConnection(null);
        setAccount(null);
        setAddress("");
    };

    return (
        <WalletContext.Provider value={{ connection, account, address, connectWallet, disconnectWallet }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error("useWallet must be used within a WalletProvider");
    }
    return context;
};
