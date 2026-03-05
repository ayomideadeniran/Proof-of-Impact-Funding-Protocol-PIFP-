"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, Info, OctagonX, X } from "lucide-react";
import { CallData, RpcProvider } from "starknet";
import { getPifpContractAddress } from "@/lib/config";
import { useWallet } from "@/context/WalletContext";

type NotificationType = "success" | "error" | "info";

type NotificationInput = {
    title: string;
    message: string;
    type?: NotificationType;
    txHash?: string;
    durationMs?: number;
};

type NotificationItem = NotificationInput & {
    id: number;
    createdAt: number;
    read: boolean;
    remainingMs: number;
    hovered: boolean;
};

type NotificationContextType = {
    notify: (notification: NotificationInput) => void;
    unreadCount: number;
    historyOpen: boolean;
    displayedHistory: NotificationItem[];
    toggleHistory: () => void;
    closeHistory: () => void;
    markRead: (id: number) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function readU256(low?: string, high?: string): bigint {
    return BigInt(low ?? "0") + (BigInt(high ?? "0") << 128n);
}

function formatEth(wei: bigint): string {
    const whole = wei / 10n ** 18n;
    const frac = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 4);
    return `${whole}.${frac}`;
}

function mapActivityToHistoryItem(activity: string[]): NotificationItem | null {
    const id = Number(BigInt(activity[0] ?? "0"));
    const kind = Number(BigInt(activity[1] ?? "0"));
    const projectId = Number(BigInt(activity[2] ?? "0"));
    const amountWei = readU256(activity[3], activity[4]);
    const timestampSeconds = Number(BigInt(activity[5] ?? "0"));
    const createdAt = timestampSeconds > 0 ? timestampSeconds * 1000 : Date.now();

    if (id === 0 || kind === 0) return null;

    if (kind === 1) {
        return {
            id,
            title: "Project created",
            message: `Project #${projectId} was published on-chain.`,
            type: "success",
            createdAt,
            read: false,
            remainingMs: 0,
            hovered: false
        };
    }

    if (kind === 2) {
        return {
            id,
            title: "Donation recorded",
            message: `You donated ${formatEth(amountWei)} ETH to project #${projectId}.`,
            type: "success",
            createdAt,
            read: false,
            remainingMs: 0,
            hovered: false
        };
    }

    if (kind === 3) {
        return {
            id,
            title: "Proof verified",
            message: `Proof of impact was accepted for project #${projectId}.`,
            type: "success",
            createdAt,
            read: false,
            remainingMs: 0,
            hovered: false
        };
    }

    if (kind === 4) {
        return {
            id,
            title: "Funds released",
            message: `${formatEth(amountWei)} ETH was released for project #${projectId}.`,
            type: "success",
            createdAt,
            read: false,
            remainingMs: 0,
            hovered: false
        };
    }

    return null;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { address } = useWallet();
    const scopedAddress = address?.toLowerCase() ?? "";
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [history, setHistory] = useState<NotificationItem[]>([]);
    const [sessionHistory, setSessionHistory] = useState<NotificationItem[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const provider = useMemo(
        () => new RpcProvider({ nodeUrl: "https://starknet-sepolia-rpc.publicnode.com" }),
        []
    );

    const loadHistory = useCallback(async () => {
        if (!scopedAddress) {
            setHistory([]);
            setSessionHistory([]);
            setHistoryOpen(false);
            return;
        }

        try {
            const contractAddress = getPifpContractAddress();
            const countCall = await provider.callContract({
                contractAddress,
                entrypoint: "get_activity_count",
                calldata: CallData.compile({ user: scopedAddress })
            });
            const total = Number(BigInt(countCall[0] ?? "0"));
            if (total === 0) {
                setHistory([]);
                return;
            }

            const start = Math.max(1, total - 49);
            const activityCalls = await Promise.all(
                Array.from({ length: total - start + 1 }, (_, index) =>
                    provider.callContract({
                        contractAddress,
                        entrypoint: "get_activity",
                        calldata: CallData.compile({ user: scopedAddress, activity_id: start + index })
                    })
                )
            );

            const parsed = activityCalls
                .map((activity) => mapActivityToHistoryItem(activity))
                .filter((item): item is NotificationItem => item !== null)
                .reverse();

            setHistory(parsed);
        } catch (error) {
            console.error("Failed to load on-chain notification history:", error);
            setHistory([]);
        }
    }, [provider, scopedAddress]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadHistory();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadHistory]);

    useEffect(() => {
        const refreshHistory = () => {
            void loadHistory();
        };

        window.addEventListener("pifp:projects-updated", refreshHistory);
        return () => window.removeEventListener("pifp:projects-updated", refreshHistory);
    }, [loadHistory]);

    const notify = useCallback((notification: NotificationInput) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const now = Date.now();
        const duration = notification.durationMs ?? 6000;
        const item: NotificationItem = {
            ...notification,
            id,
            createdAt: now,
            read: false,
            remainingMs: duration,
            hovered: false
        };

        setNotifications((prev) => [...prev, item]);
        setSessionHistory((prev) => [item, ...prev].slice(0, 50));
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setNotifications((prev) =>
                prev
                    .map((item) =>
                        item.hovered ? item : { ...item, remainingMs: item.remainingMs - 250, read: true }
                    )
                    .filter((item) => item.remainingMs > 0)
            );
        }, 250);

        return () => clearInterval(interval);
    }, []);

    const dismiss = useCallback((id: number) => {
        setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const setHovered = useCallback((id: number, hovered: boolean) => {
        setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, hovered } : item)));
    }, []);

    const markAllRead = useCallback(() => {
        setHistory((prev) => prev.map((item) => ({ ...item, read: true })));
        setSessionHistory((prev) => prev.map((item) => ({ ...item, read: true })));
    }, []);

    const markRead = useCallback((id: number) => {
        setHistory((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
        setSessionHistory((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    }, []);

    const toggleHistory = useCallback(() => {
        setHistoryOpen((prev) => {
            const next = !prev;
            if (next) {
                markAllRead();
            }
            return next;
        });
    }, [markAllRead]);

    const closeHistory = useCallback(() => {
        setHistoryOpen(false);
    }, []);

    const displayedHistory = useMemo(() => {
        const merged = [...sessionHistory, ...history];
        const seen = new Set<number>();
        return merged.filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
    }, [history, sessionHistory]);
    const unreadCount = displayedHistory.filter((item) => !item.read).length;
    const value = useMemo(
        () => ({
            notify,
            unreadCount,
            historyOpen,
            displayedHistory,
            toggleHistory,
            closeHistory,
            markRead
        }),
        [closeHistory, displayedHistory, historyOpen, markRead, notify, toggleHistory, unreadCount]
    );

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <div className="pointer-events-none fixed right-3 top-24 z-[160] w-[360px] max-w-[calc(100vw-1rem)] space-y-2.5 sm:right-4 sm:top-28 sm:w-[380px] sm:max-w-[calc(100vw-1.5rem)] sm:space-y-3">
                {notifications.map((item) => (
                    <div
                        key={item.id}
                        onMouseEnter={() => setHovered(item.id, true)}
                        onMouseLeave={() => setHovered(item.id, false)}
                        className={clsx(
                            "pointer-events-auto group relative overflow-hidden rounded-2xl border px-4 py-3 backdrop-blur-xl shadow-2xl transition-all",
                            "bg-gradient-to-br from-white/10 to-white/5",
                            item.type === "success" && "border-emerald-300/30 text-emerald-100",
                            item.type === "error" && "border-rose-300/30 text-rose-100",
                            (!item.type || item.type === "info") && "border-sky-300/30 text-sky-100"
                        )}
                    >
                        <div className="absolute left-0 top-0 h-full w-1 bg-white/20" />
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                                {item.type === "success" && <CheckCircle2 className="h-4 w-4" />}
                                {item.type === "error" && <OctagonX className="h-4 w-4" />}
                                {(!item.type || item.type === "info") && <Info className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm">{item.title}</p>
                                <p className="text-xs mt-1 opacity-90">{item.message}</p>
                                {item.txHash && (
                                    <a
                                        href={`https://sepolia.starkscan.co/tx/${item.txHash}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block text-xs mt-2 underline break-all"
                                    >
                                        View tx: {item.txHash}
                                    </a>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => dismiss(item.id)}
                                className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
                                aria-label="Dismiss notification"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mt-2 h-1 rounded-full bg-white/10">
                            <div
                                className="h-1 rounded-full bg-white/40 transition-all"
                                style={{
                                    width: `${Math.max(0, Math.min(100, (item.remainingMs / (item.durationMs ?? 6000)) * 100))}%`
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {historyOpen && scopedAddress && (
                <>
                    <button
                        type="button"
                        aria-label="Close notification history"
                        onClick={closeHistory}
                        className="fixed inset-0 z-[175] cursor-default bg-transparent"
                    />
                    <div className="fixed right-3 top-36 z-[180] w-[440px] max-w-[calc(100vw-1rem)] rounded-3xl border border-slate-600/60 bg-slate-950/96 p-3 shadow-2xl backdrop-blur-2xl sm:right-5 sm:top-40 sm:p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-white">Notification History</p>
                            <p className="text-[11px] text-slate-400">Loaded from on-chain wallet activity.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setHistoryOpen(false)}
                            className="rounded-md p-1 text-slate-300 hover:bg-slate-800 hover:text-white"
                            aria-label="Close history"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                        {displayedHistory.length === 0 && (
                            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 text-xs text-slate-300">
                                No on-chain notifications yet for this wallet.
                            </div>
                        )}
                        {displayedHistory.map((item) => (
                            <div
                                key={item.id}
                                className={clsx(
                                    "rounded-2xl border p-3",
                                    item.type === "success" && "border-emerald-300/20 bg-emerald-500/10 text-emerald-100",
                                    item.type === "error" && "border-rose-300/20 bg-rose-500/10 text-rose-100",
                                    (!item.type || item.type === "info") && "border-cyan-300/20 bg-cyan-500/10 text-cyan-100"
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-medium">{item.title}</p>
                                        <p className="mt-1 text-xs opacity-90">{item.message}</p>
                                    </div>
                                    {!item.read && (
                                        <button
                                            type="button"
                                            onClick={() => markRead(item.id)}
                                            className="rounded-md border border-white/15 px-2 py-1 text-[10px] text-white/80 hover:bg-white/10"
                                        >
                                            Mark read
                                        </button>
                                    )}
                                </div>
                            <p className="mt-2 text-[10px] opacity-70">{new Date(item.createdAt).toLocaleString()}</p>
                        </div>
                        ))}
                    </div>
                    </div>
                </>
            )}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotification must be used within a NotificationProvider");
    }
    return context;
}
