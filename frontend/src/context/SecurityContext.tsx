"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useWallet } from "@/context/WalletContext";
import { useNotification } from "@/context/NotificationContext";

type SecurityAction = "general" | "create_project" | "donate" | "submit_proof";
type ActionToken = string;

type SecurityContextType = {
    verified: boolean;
    openVerificationModal: (reason?: string) => void;
    ensureVerifiedAction: (
        action: Exclude<SecurityAction, "general">,
        reason?: string,
        projectId?: number
    ) => Promise<ActionToken | null>;
};

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);
const ORACLE_URL = process.env.NEXT_PUBLIC_ORACLE_URL ?? "http://127.0.0.1:3001";
const PROFILE_STORAGE_KEY = "pifp_security_profiles_v1";
const OTP_DIGITS = 6;
const REQUEST_COOLDOWN_SECONDS = 20;
const RENDER_COLD_START_SECONDS = 50;

type SecurityProfile = {
    email: string;
    emailMasked?: string;
    verified: boolean;
};

function loadProfileMap(): Record<string, SecurityProfile> {
    if (typeof window === "undefined") return {};
    try {
        const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Record<string, SecurityProfile>) : {};
    } catch {
        return {};
    }
}

function saveProfile(address: string, profile: SecurityProfile): void {
    if (typeof window === "undefined" || !address) return;
    const map = loadProfileMap();
    map[address.toLowerCase()] = profile;
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(map));
}

export function SecurityProvider({ children }: { children: React.ReactNode }) {
    const { address, account } = useWallet();
    const { notify } = useNotification();
    const walletAddress = (address || account?.address?.toString() || "").toLowerCase();
    const [verified, setVerified] = useState(false);
    const [savedEmail, setSavedEmail] = useState("");
    const [savedEmailMasked, setSavedEmailMasked] = useState("");
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [pendingAction, setPendingAction] = useState<SecurityAction>("general");
    const [pendingProjectId, setPendingProjectId] = useState<number>(0);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [otpError, setOtpError] = useState("");
    const [otpRequested, setOtpRequested] = useState(false);
    const [otpRequestedForEmail, setOtpRequestedForEmail] = useState("");
    const [otpExpiresAtMs, setOtpExpiresAtMs] = useState<number>(0);
    const [requestCooldownUntilMs, setRequestCooldownUntilMs] = useState<number>(0);
    const [nowMs, setNowMs] = useState<number>(Date.now());
    const [requesting, setRequesting] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [devOtp, setDevOtp] = useState("");
    const resolverRef = useRef<((token: ActionToken | null) => void) | null>(null);

    useEffect(() => {
        if (!open) return;
        const timer = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [open]);

    const normalizeEmail = useCallback((value: string) => value.trim().toLowerCase(), []);
    const isEmailValid = useCallback((value: string) => /\S+@\S+\.\S+/.test(normalizeEmail(value)), [normalizeEmail]);

    const walletHasBoundEmail = Boolean(savedEmail || savedEmailMasked);
    const targetEmail = normalizeEmail(savedEmail || email);
    const isRequestCoolingDown = requestCooldownUntilMs > nowMs;
    const secondsUntilResend = Math.max(0, Math.ceil((requestCooldownUntilMs - nowMs) / 1000));
    const secondsUntilOtpExpiry = Math.max(0, Math.ceil((otpExpiresAtMs - nowMs) / 1000));
    const isOtpExpired = otpRequested && otpExpiresAtMs > 0 && nowMs >= otpExpiresAtMs;
    const canRequestOtp =
        Boolean(walletAddress) &&
        (walletHasBoundEmail || isEmailValid(targetEmail)) &&
        !requesting &&
        !isRequestCoolingDown;
    const canVerifyOtp =
        Boolean(walletAddress) &&
        otpRequested &&
        !isOtpExpired &&
        (walletHasBoundEmail || targetEmail === otpRequestedForEmail) &&
        otp.trim().length === OTP_DIGITS &&
        /^\d+$/.test(otp.trim()) &&
        !verifying;

    useEffect(() => {
        if (!walletAddress) {
            if (resolverRef.current) {
                resolverRef.current(null);
                resolverRef.current = null;
            }
            setVerified(false);
            setSavedEmail("");
            setSavedEmailMasked("");
            setEmail("");
            setOpen(false);
            return;
        }
        const load = async () => {
            const map = loadProfileMap();
            const profile = map[walletAddress];
            const fallbackEmail = profile?.email ?? "";
            // Start as unverified until we hear from the server.
            setVerified(false);
            setSavedEmail(fallbackEmail);
            setSavedEmailMasked(profile?.emailMasked ?? "");
            setEmail(fallbackEmail);

            try {
                const res = await fetch(`${ORACLE_URL}/wallet-profile?wallet_address=${encodeURIComponent(walletAddress)}`);
                const data = await res.json();
                if (res.ok && data?.email_bound) {
                    setSavedEmail(fallbackEmail);
                    setSavedEmailMasked(data.email_masked ?? "");
                    setEmail(fallbackEmail);
                    setVerified(true);
                    saveProfile(walletAddress, {
                        email: fallbackEmail,
                        emailMasked: data.email_masked ?? "",
                        verified: true
                    });
                }
            } catch {
                // If API is down, assume unverified for safety.
                setVerified(false);
            }
        };
        void load();
    }, [walletAddress]);

    const openVerificationModal = useCallback((nextReason?: string) => {
        if (!walletAddress) {
            notify({
                title: "Wallet required",
                message: "Connect wallet before verification.",
                type: "info"
            });
            return;
        }
        if (resolverRef.current) {
            resolverRef.current(null);
            resolverRef.current = null;
        }
        setReason(nextReason ?? "Complete OTP verification to continue.");
        setPendingAction("general");
        setPendingProjectId(0);
        setOtp("");
        setOtpError("");
        setOtpRequested(false);
        setOtpRequestedForEmail("");
        setOtpExpiresAtMs(0);
        setRequestCooldownUntilMs(0);
        setDevOtp("");
        setOpen(true);
    }, [notify, walletAddress]);

    const ensureVerifiedAction = useCallback(
        (action: Exclude<SecurityAction, "general">, nextReason?: string, projectId?: number) => {
            if (!walletAddress) {
                notify({
                    title: "Wallet required",
                    message: "Connect wallet before verification.",
                    type: "info"
                });
                return Promise.resolve(null);
            }
            if (resolverRef.current) {
                resolverRef.current(null);
                resolverRef.current = null;
            }
            setReason(nextReason ?? "OTP verification is required for this action.");
            setPendingAction(action);
            setPendingProjectId(projectId ?? 0);
            setOtp("");
            setOtpError("");
            setOtpRequested(false);
            setOtpRequestedForEmail("");
            setOtpExpiresAtMs(0);
            setRequestCooldownUntilMs(0);
            setDevOtp("");
            setOpen(true);
            return new Promise<ActionToken | null>((resolve) => {
                resolverRef.current = resolve;
            });
        },
        [notify, walletAddress]
    );

    const issueActionToken = async (targetEmail: string): Promise<ActionToken> => {
        if (!walletAddress) throw new Error("Wallet is required");
        if (pendingAction === "general") throw new Error("No protected action selected");

        const res = await fetch(`${ORACLE_URL}/issue-action-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: targetEmail || undefined,
                action: pendingAction,
                wallet_address: walletAddress,
                project_id: pendingProjectId
            })
        });
        const data = await res.json();
        if (!res.ok || !data.action_token) {
            throw new Error(data.error ?? "Could not issue action token");
        }
        return data.action_token as string;
    };

    const requestOtp = async () => {
        if (!walletAddress) {
            notify({ title: "Wallet required", message: "Connect wallet before requesting OTP.", type: "error" });
            return;
        }
        if (!walletHasBoundEmail && !targetEmail) {
            notify({ title: "Email required", message: "Enter your email first.", type: "error" });
            return;
        }
        if (!walletHasBoundEmail && !isEmailValid(targetEmail)) {
            notify({ title: "Invalid email", message: "Enter a valid email address.", type: "error" });
            return;
        }
        if (isRequestCoolingDown) {
            notify({
                title: "Please wait",
                message: `You can request a new OTP in ${secondsUntilResend}s.`,
                type: "info"
            });
            return;
        }

        setRequesting(true);
        notify({
            title: "Starting OTP request",
            message: `The backend is hosted on Render and may take up to ${RENDER_COLD_START_SECONDS} seconds to wake up before the OTP is sent.`,
            type: "info",
            durationMs: 9000
        });
        try {
            const res = await fetch(`${ORACLE_URL}/request-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    wallet_address: walletAddress,
                    email: walletHasBoundEmail ? undefined : targetEmail
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "OTP request failed");
            const expiresIn = Number(data.expires_in_seconds ?? 300);
            const now = Date.now();
            const requestLabel = walletHasBoundEmail ? (savedEmailMasked || "wallet-linked email") : targetEmail;
            setOtp("");
            setOtpError("");
            setOtpRequested(true);
            setOtpRequestedForEmail(requestLabel);
            setOtpExpiresAtMs(now + expiresIn * 1000);
            setRequestCooldownUntilMs(now + REQUEST_COOLDOWN_SECONDS * 1000);
            setDevOtp(typeof data.dev_otp === "string" ? data.dev_otp : "");
            notify({
                title: "OTP sent",
                message: data.dev_otp
                    ? `Demo mode is enabled. Use the OTP shown in the modal for ${requestLabel}.`
                    : `OTP sent to ${requestLabel}.`,
                type: "info"
            });
        } catch (error) {
            setOtpRequested(false);
            setOtpRequestedForEmail("");
            setOtpExpiresAtMs(0);
            setDevOtp("");
            const errorMessage = error instanceof Error ? error.message : "Could not send OTP. Ensure oracle-service is running.";
            const looksLikeColdStart =
                errorMessage === "Failed to fetch" ||
                errorMessage.toLowerCase().includes("fetch") ||
                errorMessage.toLowerCase().includes("network");
            notify({
                title: "OTP request failed",
                message: looksLikeColdStart
                    ? `The Render backend may still be waking up. Wait about ${RENDER_COLD_START_SECONDS} seconds, then request OTP again.`
                    : errorMessage,
                type: "error"
            });
        } finally {
            setRequesting(false);
        }
    };

    const verifyOtp = async () => {
        if (!walletAddress) return;
        if (!otpRequested) {
            setOtpError("Request OTP first.");
            notify({
                title: "OTP not sent",
                message: "Request OTP first before verifying.",
                type: "error"
            });
            return;
        }
        if (isOtpExpired) {
            setOtpError("OTP expired. Request a new code.");
            notify({
                title: "OTP expired",
                message: "Your OTP has expired. Request a new one.",
                type: "error"
            });
            return;
        }
        if (!canVerifyOtp) {
            setOtpError("Enter the 6-digit OTP sent to your email.");
            notify({
                title: "Invalid OTP input",
                message: "Enter the 6-digit OTP sent to your email.",
                type: "error"
            });
            return;
        }

        setVerifying(true);
        setOtpError("");
        try {
            const res = await fetch(`${ORACLE_URL}/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    wallet_address: walletAddress,
                    email: walletHasBoundEmail ? undefined : targetEmail,
                    otp: otp.trim()
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "OTP verification failed");
            setVerified(true);
            const canonicalEmail = targetEmail || savedEmail;
            setSavedEmail(canonicalEmail);
            setSavedEmailMasked(savedEmailMasked || canonicalEmail);
            setEmail(canonicalEmail);
            saveProfile(walletAddress, {
                email: canonicalEmail,
                emailMasked: savedEmailMasked || canonicalEmail,
                verified: true
            });
            const actionToken = pendingAction === "general" ? null : await issueActionToken(targetEmail);
            setOpen(false);
            setOtp("");
            setOtpError("");
            setReason("");
            setPendingAction("general");
            setPendingProjectId(0);
            setOtpRequested(false);
            setOtpRequestedForEmail("");
            setOtpExpiresAtMs(0);
            setRequestCooldownUntilMs(0);
            setDevOtp("");
            if (resolverRef.current) {
                resolverRef.current(actionToken);
                resolverRef.current = null;
            }
            notify({
                title: "Verification successful",
                message: actionToken
                    ? "Security check complete and one-time action token issued."
                    : "Security check complete.",
                type: "success"
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Invalid OTP or oracle unavailable.";
            if (errorMessage.toLowerCase().includes("invalid otp")) {
                setOtpError("Wrong OTP code. Check the latest code sent to your email and try again.");
            } else if (errorMessage.toLowerCase().includes("expired")) {
                setOtpError("OTP expired. Request a new code.");
            } else {
                setOtpError(errorMessage);
            }
            if (resolverRef.current) {
                resolverRef.current(null);
                resolverRef.current = null;
            }
            notify({
                title: "Verification failed",
                message: errorMessage,
                type: "error"
            });
        } finally {
            setVerifying(false);
        }
    };

    const closeModal = () => {
        setOpen(false);
        setOtp("");
        setOtpError("");
        setReason("");
        setPendingAction("general");
        setPendingProjectId(0);
        setOtpRequested(false);
        setOtpRequestedForEmail("");
        setOtpExpiresAtMs(0);
        setRequestCooldownUntilMs(0);
        setDevOtp("");
        if (resolverRef.current) {
            resolverRef.current(null);
            resolverRef.current = null;
        }
    };

    const value = useMemo(
        () => ({
            verified,
            openVerificationModal,
            ensureVerifiedAction
        }),
        [ensureVerifiedAction, openVerificationModal, verified]
    );

    return (
        <SecurityContext.Provider value={value}>
            {children}

            {open && (
                <div className="fixed inset-0 z-[130] flex flex-col items-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
                    <div className="my-auto w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 sm:p-8 shadow-2xl">
                        <h4 className="text-xl font-bold text-white tracking-tight">Security Verification</h4>
                        <p className="text-sm text-zinc-400 mt-1">{reason || "Verify identity to proceed."}</p>
                        {pendingAction !== "general" && (
                            <p className="text-[11px] font-semibold text-emerald-400 mt-2 uppercase tracking-wider">
                                Action: {pendingAction.replace("_", " ")}
                            </p>
                        )}
                        <p className="text-xs text-zinc-500 mt-3 p-3 rounded-xl bg-white/5 border border-white/5">
                            {walletHasBoundEmail
                                ? `Wallet-linked email: ${savedEmailMasked || savedEmail} (OTP will always be sent here)`
                                : "First-time signup: add an email to bind OTP security to this wallet."}
                        </p>
                        <p className="text-xs text-amber-300/90 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            The OTP backend is hosted on Render. If the server is asleep, the first OTP request can take up to {RENDER_COLD_START_SECONDS} seconds while it wakes up.
                        </p>

                        <div className="space-y-4 mt-6">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email address"
                                disabled={walletHasBoundEmail}
                                className={clsx(
                                    "w-full rounded-xl border border-white/5 bg-zinc-900/60 p-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all hover:border-white/10",
                                    walletHasBoundEmail && "opacity-70 cursor-not-allowed"
                                )}
                            />
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => {
                                    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, OTP_DIGITS);
                                    setOtp(digitsOnly);
                                    if (otpError) setOtpError("");
                                }}
                                placeholder="6-digit OTP code"
                                inputMode="numeric"
                                maxLength={OTP_DIGITS}
                                className={clsx(
                                    "w-full rounded-xl border bg-zinc-900/60 p-3.5 text-sm text-white placeholder-zinc-500 transition-all hover:border-white/10",
                                    otpError ? "border-rose-500/70 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500" : "border-white/5 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                                )}
                            />
                            {otpError && <p className="text-xs text-rose-400 font-medium">{otpError}</p>}
                        </div>
                        <div className="mt-3 text-[11px] text-zinc-500">
                            {!otpRequested && <p>Request OTP first to enable verification.</p>}
                            {otpRequested && !isOtpExpired && (
                                <p>
                                    OTP sent to <strong className="text-zinc-300">{otpRequestedForEmail}</strong>. Expires in {secondsUntilOtpExpiry}s.
                                </p>
                            )}
                            {otpRequested && isOtpExpired && <p className="text-amber-400">OTP expired. Request a new OTP.</p>}
                        </div>
                        {devOtp && (
                            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                                <p className="font-semibold uppercase tracking-wider text-[10px] text-emerald-400/80 mb-1">Demo OTP</p>
                                <p className="mb-2 text-[11px] text-emerald-200/80">
                                    Email delivery is bypassed for public testing. Use this code to continue.
                                </p>
                                <div className="flex items-center justify-between gap-2">
                                    <code className="font-mono text-sm tracking-widest font-bold text-white">{devOtp}</code>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await navigator.clipboard.writeText(devOtp);
                                            notify({
                                                title: "OTP copied",
                                                message: "Demo OTP copied to clipboard.",
                                                type: "info"
                                            });
                                        }}
                                        className="rounded-lg border border-emerald-500/30 px-2 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/20 transition-colors"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={requestOtp}
                                disabled={!canRequestOtp}
                                className={clsx(
                                    "rounded-xl py-3 text-sm font-semibold border border-white/10 bg-zinc-800/80 text-zinc-200 transition-all hover:bg-zinc-700/80 hover:border-white/20",
                                    !canRequestOtp && "opacity-50 cursor-not-allowed hover:bg-zinc-800/80 hover:border-white/10"
                                )}
                            >
                                {requesting
                                    ? "Sending..."
                                    : isRequestCoolingDown
                                        ? `Resend in ${secondsUntilResend}s`
                                        : otpRequested
                                            ? "Resend OTP"
                                            : "Request OTP"}
                            </button>
                            <button
                                type="button"
                                onClick={verifyOtp}
                                disabled={!canVerifyOtp}
                                className={clsx(
                                    "rounded-xl py-3 text-sm font-bold border transition-all",
                                    !canVerifyOtp
                                        ? "bg-zinc-900 border-white/5 text-zinc-500 cursor-not-allowed"
                                        : "border-emerald-500/50 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                                )}
                            >
                                {verifying ? "Verifying..." : "Verify & Continue"}
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={closeModal}
                            className="mt-4 w-full rounded-xl py-2 text-xs font-medium text-zinc-500 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </SecurityContext.Provider>
    );
}

export function useSecurity() {
    const ctx = useContext(SecurityContext);
    if (!ctx) {
        throw new Error("useSecurity must be used within a SecurityProvider");
    }
    return ctx;
}
// Finalizing commit 28: security context guards
