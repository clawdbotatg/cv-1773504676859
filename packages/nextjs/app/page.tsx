"use client";

import { useState } from "react";
import { base } from "viem/chains";
import { useAccount, useSwitchChain } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const OWNER_FALLBACK = "0xa2aD5F70B2EaccA81910561B3c1c7FfEC2B2C2B3";
const OPERATOR_FALLBACK = "0xeB99a27AD482534FBf40213d6714e130A43Db0d8";

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function translateError(e: any): string {
  const msg = e?.message || e?.shortMessage || "Transaction failed";
  if (msg.includes("User rejected") || msg.includes("user rejected")) return "Transaction cancelled";
  if (msg.includes("Not authorized")) return "Connected wallet is not authorized for this action";
  if (msg.includes("Not owner")) return "Only the owner wallet can perform this action";
  if (msg.includes("Not pending owner")) return "Only the pending owner can accept ownership";
  return msg.length > 200 ? msg.slice(0, 200) + "…" : msg;
}

export default function Home() {
  const { address, chain } = useAccount();
  const { switchChain } = useSwitchChain();

  // Read live owner/operator from contract
  const { data: liveOwner } = useScaffoldReadContract({ contractName: "LegacyFeeBurner", functionName: "owner" });
  const { data: liveOperator } = useScaffoldReadContract({ contractName: "LegacyFeeBurner", functionName: "operator" });
  const { data: liveToken } = useScaffoldReadContract({ contractName: "LegacyFeeBurner", functionName: "token" });
  const { data: liveSafe } = useScaffoldReadContract({ contractName: "LegacyFeeBurner", functionName: "safe" });
  const { data: liveBurnEngine } = useScaffoldReadContract({
    contractName: "LegacyFeeBurner",
    functionName: "burnEngine",
  });

  const currentOwner = (liveOwner as string) || OWNER_FALLBACK;
  const currentOperator = (liveOperator as string) || OPERATOR_FALLBACK;

  const isOwner = address?.toLowerCase() === currentOwner.toLowerCase();
  const isOperator = address?.toLowerCase() === currentOperator.toLowerCase();
  const isOnBase = chain?.id === base.id;

  // Separate write hooks
  const { writeContractAsync: claimAndBurn } = useScaffoldWriteContract("LegacyFeeBurner");
  const { writeContractAsync: recoverCreatorWrite } = useScaffoldWriteContract("LegacyFeeBurner");
  const { writeContractAsync: transferCreatorWrite } = useScaffoldWriteContract("LegacyFeeBurner");
  const { writeContractAsync: setOperatorWrite } = useScaffoldWriteContract("LegacyFeeBurner");
  const { writeContractAsync: transferOwnershipWrite } = useScaffoldWriteContract("LegacyFeeBurner");
  const { writeContractAsync: acceptOwnershipWrite } = useScaffoldWriteContract("LegacyFeeBurner");

  // Separate loading states
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isTransferringCreator, setIsTransferringCreator] = useState(false);
  const [isSettingOperator, setIsSettingOperator] = useState(false);
  const [isTransferringOwnership, setIsTransferringOwnership] = useState(false);
  const [isAcceptingOwnership, setIsAcceptingOwnership] = useState(false);

  // Input states
  const [newCreatorAddr, setNewCreatorAddr] = useState("");
  const [newOperatorAddr, setNewOperatorAddr] = useState("");
  const [newOwnerAddr, setNewOwnerAddr] = useState("");

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await claimAndBurn({ functionName: "claimLegacyAndBurn" });
      notification.success("Legacy fees claimed and burned!");
    } catch (e: any) {
      notification.error(translateError(e));
    } finally {
      setIsClaiming(false);
    }
  };

  const handleRecover = async () => {
    setIsRecovering(true);
    try {
      await recoverCreatorWrite({ functionName: "recoverCreator" });
      notification.success("Creator recovered to owner!");
    } catch (e: any) {
      notification.error(translateError(e));
    } finally {
      setIsRecovering(false);
    }
  };

  const handleTransferCreator = async () => {
    if (!newCreatorAddr) return;
    setIsTransferringCreator(true);
    try {
      await transferCreatorWrite({ functionName: "transferCreator", args: [newCreatorAddr as `0x${string}`] });
      notification.success("Creator transferred!");
      setNewCreatorAddr("");
    } catch (e: any) {
      notification.error(translateError(e));
    } finally {
      setIsTransferringCreator(false);
    }
  };

  const handleSetOperator = async () => {
    if (!newOperatorAddr) return;
    setIsSettingOperator(true);
    try {
      await setOperatorWrite({ functionName: "setOperator", args: [newOperatorAddr as `0x${string}`] });
      notification.success("Operator updated!");
      setNewOperatorAddr("");
    } catch (e: any) {
      notification.error(translateError(e));
    } finally {
      setIsSettingOperator(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!newOwnerAddr) return;
    setIsTransferringOwnership(true);
    try {
      await transferOwnershipWrite({ functionName: "transferOwnership", args: [newOwnerAddr as `0x${string}`] });
      notification.success("Ownership transfer started! New owner must call Accept.");
      setNewOwnerAddr("");
    } catch (e: any) {
      notification.error(translateError(e));
    } finally {
      setIsTransferringOwnership(false);
    }
  };

  const handleAcceptOwnership = async () => {
    setIsAcceptingOwnership(true);
    try {
      await acceptOwnershipWrite({ functionName: "acceptOwnership" });
      notification.success("Ownership accepted!");
    } catch (e: any) {
      notification.error(translateError(e));
    } finally {
      setIsAcceptingOwnership(false);
    }
  };

  return (
    <div className="flex flex-col items-center pt-10 px-4">
      <div className="max-w-xl w-full">
        <h1 className="text-4xl font-bold text-center">LegacyFeeBurner</h1>
        <p className="text-center opacity-70 mt-2">Permissionless legacy fee burning for Clanker v3.1 creators</p>

        {/* Contract Info */}
        <div className="card bg-base-100 shadow-md mt-6 p-4">
          <div className="text-sm space-y-1">
            <div>
              <span className="font-semibold">Owner:</span>{" "}
              <span className="font-mono text-xs">{shortenAddress(currentOwner)}</span>
            </div>
            <div>
              <span className="font-semibold">Operator:</span>{" "}
              <span className="font-mono text-xs">{shortenAddress(currentOperator)}</span>
            </div>
            {liveToken && (
              <div>
                <span className="font-semibold">Token:</span>{" "}
                <span className="font-mono text-xs">{shortenAddress(liveToken as string)}</span>
              </div>
            )}
            {liveSafe && (
              <div>
                <span className="font-semibold">Safe:</span>{" "}
                <span className="font-mono text-xs">{shortenAddress(liveSafe as string)}</span>
              </div>
            )}
            {liveBurnEngine && (
              <div>
                <span className="font-semibold">BurnEngine:</span>{" "}
                <span className="font-mono text-xs">{shortenAddress(liveBurnEngine as string)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Action */}
        <div className="mt-6 flex flex-col items-center gap-4">
          {!address ? (
            <RainbowKitCustomConnectButton />
          ) : !isOnBase ? (
            <button className="btn btn-warning btn-lg" onClick={() => switchChain({ chainId: base.id })}>
              Switch to Base
            </button>
          ) : (
            <button
              className={`btn btn-primary btn-lg w-full ${isClaiming ? "loading" : ""}`}
              onClick={handleClaim}
              disabled={isClaiming}
            >
              {isClaiming ? "Claiming & Burning…" : "🔥 Claim & Burn All"}
            </button>
          )}
        </div>

        {/* Operator Controls */}
        {address && isOnBase && (isOperator || isOwner) && (
          <div className="card bg-base-100 shadow-md mt-6 p-4">
            <h2 className="font-bold text-lg mb-3">
              <span className="badge badge-accent mr-2">{isOwner ? "Owner" : "Operator"}</span>
              Controls
            </h2>
            <button
              className={`btn btn-warning w-full ${isRecovering ? "loading" : ""}`}
              onClick={handleRecover}
              disabled={isRecovering}
            >
              {isRecovering ? "Recovering…" : "⚠️ Recover Creator to Owner"}
            </button>
          </div>
        )}

        {/* Owner-only Controls */}
        {address && isOnBase && isOwner && (
          <div className="card bg-base-100 shadow-md mt-4 p-4 space-y-4">
            <h2 className="font-bold text-lg">Owner Admin</h2>

            {/* Transfer Creator */}
            <div>
              <label className="label text-sm font-semibold">Transfer Creator</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1 font-mono text-xs"
                  placeholder="0x… new creator address"
                  value={newCreatorAddr}
                  onChange={e => setNewCreatorAddr(e.target.value)}
                />
                <button
                  className={`btn btn-error ${isTransferringCreator ? "loading" : ""}`}
                  onClick={handleTransferCreator}
                  disabled={isTransferringCreator || !newCreatorAddr}
                >
                  Transfer
                </button>
              </div>
            </div>

            {/* Set Operator */}
            <div>
              <label className="label text-sm font-semibold">Set Operator</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1 font-mono text-xs"
                  placeholder="0x… new operator address"
                  value={newOperatorAddr}
                  onChange={e => setNewOperatorAddr(e.target.value)}
                />
                <button
                  className={`btn btn-secondary ${isSettingOperator ? "loading" : ""}`}
                  onClick={handleSetOperator}
                  disabled={isSettingOperator || !newOperatorAddr}
                >
                  Set
                </button>
              </div>
            </div>

            {/* Transfer Ownership */}
            <div>
              <label className="label text-sm font-semibold">Transfer Ownership (2-step)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1 font-mono text-xs"
                  placeholder="0x… new owner address"
                  value={newOwnerAddr}
                  onChange={e => setNewOwnerAddr(e.target.value)}
                />
                <button
                  className={`btn btn-error ${isTransferringOwnership ? "loading" : ""}`}
                  onClick={handleTransferOwnership}
                  disabled={isTransferringOwnership || !newOwnerAddr}
                >
                  Start Transfer
                </button>
              </div>
            </div>

            {/* Accept Ownership */}
            <button
              className={`btn btn-outline w-full ${isAcceptingOwnership ? "loading" : ""}`}
              onClick={handleAcceptOwnership}
              disabled={isAcceptingOwnership}
            >
              {isAcceptingOwnership ? "Accepting…" : "Accept Ownership"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
