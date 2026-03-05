"use client";
import { useWallet } from "@/context/WalletContext";
import { BadgeCheck, LogOut, ShieldAlert, Wallet } from "lucide-react";
import { useSecurity } from "@/context/SecurityContext";

export default function ConnectWallet() {
  const { address, connectWallet, disconnectWallet } = useWallet();
  const { verified, openVerificationModal } = useSecurity();

  return (
    <div className="flex items-center max-w-full">
      {address ? (
        <div className="flex max-w-full items-center gap-1.5 rounded-full border border-white/5 bg-zinc-800/50 px-2 py-1.5 shadow-lg backdrop-blur-lg sm:gap-2 sm:px-3 sm:py-2">
          <div className={`h-2 w-2 rounded-full ${verified ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span className="max-w-[92px] truncate text-[10px] font-mono text-white/90 sm:max-w-none sm:text-xs">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <button
            onClick={() => openVerificationModal("Complete OTP verification to unlock protected actions.")}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-all sm:text-[11px] ${verified
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              }`}
          >
            {verified ? <BadgeCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
            <span className="hidden sm:inline">{verified ? "Verified" : "Verify"}</span>
            <span className="sm:hidden">{verified ? "OK" : "OTP"}</span>
          </button>
          <button
            onClick={disconnectWallet}
            className="ml-0.5 inline-flex items-center gap-1 rounded-full border border-white/5 bg-zinc-900/50 px-2 py-1 text-[10px] text-zinc-400 transition-all hover:bg-zinc-700/50 hover:text-white sm:ml-1 sm:text-[11px]"
          >
            <LogOut className="h-3 w-3" />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
        >
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </button>
      )}
    </div>
  );
}
