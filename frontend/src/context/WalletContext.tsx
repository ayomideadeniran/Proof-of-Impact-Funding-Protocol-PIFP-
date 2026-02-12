"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { connect, disconnect } from "starknetkit";
import { AccountInterface } from "starknet";

interface WalletContextType {
    connection: any | null;
    account: AccountInterface | null;
    address: string;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
    const [connection, setConnection] = useState<any | null>(null);
    const [account, setAccount] = useState<AccountInterface | null>(null);
    const [address, setAddress] = useState<string>("");

    useEffect(() => {
        const checkConnection = async () => {
            const { wallet } = await connect({ modalMode: "neverAsk" }); // Silent connect
            if (wallet && (wallet as any).isConnected) {
                setConnection(wallet);
                setAccount((wallet as any).account);
                setAddress((wallet as any).selectedAddress);
            }
        };
        checkConnection();
    }, []);

    const connectWallet = async () => {
        try {
            const { wallet } = await connect({
                modalMode: "alwaysAsk",
                webWalletUrl: "https://web.argent.xyz"
            });

            if (wallet && (wallet as any).isConnected) {
                setConnection(wallet);
                setAccount((wallet as any).account);
                setAddress((wallet as any).selectedAddress);
            }
        } catch (e) {
            console.error(e);
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
