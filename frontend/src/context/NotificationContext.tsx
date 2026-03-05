"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Bell, CheckCircle2, Info, OctagonX, X } from "lucide-react";
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
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
const STORAGE_KEY_PREFIX = "pifp_notification_history_v1";

function historyKey(address: string): string {
    return `${STORAGE_KEY_PREFIX}:${address.toLowerCase()}`;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { address } = useWallet();
    const scopedAddress = address?.toLowerCase() ?? "";
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [history, setHistory] = useState<NotificationItem[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);

    useEffect(() => {
        if (!scopedAddress || typeof window === "undefined") {
            setHistory([]);
            setHistoryOpen(false);
            return;
        }
        try {
            const raw = window.localStorage.getItem(historyKey(scopedAddress));
            const parsed = raw ? (JSON.parse(raw) as NotificationItem[]) : [];
            setHistory(parsed ?? []);
        } catch {
            setHistory([]);
        }
    }, [scopedAddress]);

    useEffect(() => {
        if (!scopedAddress || typeof window === "undefined") return;
        window.localStorage.setItem(historyKey(scopedAddress), JSON.stringify(history.slice(0, 200)));
    }, [history, scopedAddress]);

    const notify = useCallback(
        (notification: NotificationInput) => {
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
            if (scopedAddress) {
                setHistory((prev) => [item, ...prev].slice(0, 200));
            }
        },
        [scopedAddress]
    );

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
        setHistory((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    }, []);

    const setHovered = useCallback((id: number, hovered: boolean) => {
        setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, hovered } : item)));
    }, []);

    const markAllRead = useCallback(() => {
        setHistory((prev) => prev.map((item) => ({ ...item, read: true })));
    }, []);

    const markRead = useCallback((id: number) => {
        setHistory((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    }, []);

    const unreadCount = history.filter((item) => !item.read).length;
    const value = useMemo(() => ({ notify }), [notify]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <div className="fixed right-3 top-20 z-[160] w-[360px] max-w-[calc(100vw-1rem)] space-y-2.5 sm:right-4 sm:top-24 sm:w-[380px] sm:max-w-[calc(100vw-1.5rem)] sm:space-y-3">
                {notifications.map((item) => (
                    <div
                        key={item.id}
                        onMouseEnter={() => setHovered(item.id, true)}
                        onMouseLeave={() => setHovered(item.id, false)}
                        className={clsx(
                            "group relative overflow-hidden rounded-2xl border px-4 py-3 backdrop-blur-xl shadow-2xl transition-all",
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

            {scopedAddress && (
                <div className="fixed right-3 top-3 z-[170] sm:right-5 sm:top-5">
                    <button
                        type="button"
                        onClick={() => {
                            setHistoryOpen((prev) => !prev);
                            markAllRead();
                        }}
                        className="relative rounded-full border border-white/20 bg-black/50 p-3 text-white shadow-2xl backdrop-blur-xl hover:bg-black/65"
                        aria-label="Open notifications"
                    >
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-black text-center">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            )}

            {historyOpen && scopedAddress && (
                <div className="fixed right-3 top-16 z-[170] w-[420px] max-w-[calc(100vw-1rem)] rounded-2xl border border-white/20 bg-black/60 p-3 shadow-2xl backdrop-blur-2xl sm:right-5 sm:top-20 sm:p-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-white">Notification History</p>
                        <button
                            type="button"
                            onClick={() => setHistoryOpen(false)}
                            className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
                            aria-label="Close history"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                        {history.length === 0 && <p className="text-xs text-white/70">No notifications yet.</p>}
                        {history.map((item) => (
                            <div
                                key={item.id}
                                className={clsx(
                                    "rounded-xl border p-3",
                                    item.type === "success" && "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
                                    item.type === "error" && "border-rose-300/25 bg-rose-500/10 text-rose-100",
                                    (!item.type || item.type === "info") && "border-sky-300/25 bg-sky-500/10 text-sky-100"
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-medium">{item.title}</p>
                                        <p className="text-xs mt-1 opacity-90">{item.message}</p>
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
                                <p className="text-[10px] mt-2 opacity-70">{new Date(item.createdAt).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
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
