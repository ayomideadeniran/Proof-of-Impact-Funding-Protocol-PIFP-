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
        <div className="flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2 py-1.5 shadow-lg backdrop-blur-lg sm:gap-2 sm:px-3 sm:py-2">
          <div className={`h-2 w-2 rounded-full ${verified ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span className="max-w-[92px] truncate text-[10px] font-mono text-white/90 sm:max-w-none sm:text-xs">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <button
            onClick={() => openVerificationModal("Complete OTP verification to unlock protected actions.")}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-colors sm:text-[11px] ${
              verified
                ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-200"
                : "border-amber-300/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
            }`}
          >
            {verified ? <BadgeCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
            <span className="hidden sm:inline">{verified ? "Verified" : "Verify"}</span>
            <span className="sm:hidden">{verified ? "OK" : "OTP"}</span>
          </button>
          <button
            onClick={disconnectWallet}
            className="ml-0.5 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/30 px-2 py-1 text-[10px] text-white/80 transition-colors hover:bg-black/50 hover:text-white sm:ml-1 sm:text-[11px]"
          >
            <LogOut className="h-3 w-3" />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          className="inline-flex items-center gap-2 rounded-full border border-sky-300/35 bg-gradient-to-r from-sky-500/80 to-cyan-400/80 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-all hover:from-sky-400 hover:to-cyan-300 sm:px-4 sm:py-2 sm:text-sm"
        >
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </button>
      )}
    </div>
  );
}
