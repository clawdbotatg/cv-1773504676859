"use client";

import { useState } from "react";
import { Address, AddressInput } from "@scaffold-ui/components";
import { base } from "viem/chains";
import { useAccount, useSwitchChain } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const OWNER_FALLBACK = "0xa2aD5F70B2EaccA81910561B3c1c7FfEC2B2C2B3";
const OPERATOR_FALLBACK = "0xeB99a27AD482534FBf40213d6714e130A43Db0d8";

function translateError(e: any): string {
  const msg = e?.message || e?.shortMessage || "Transaction failed";
  if (msg.includes("User rejected") || msg.includes("user rejected")) return "Transaction cancelled";
  if (msg.includes("Not authorized")) return "Connected wallet is not authorized for this action";
  if (msg.includes("Not owner")) return "Only the owner wallet can perform this action";
  if (msg.includes("Not pending owner")) return "Only the pending owner can accept ownership";
  return msg.length > 200 ? msg.slice(0, 200) + "…" : msg;
}

export default function Home() {
  const { data: contractInfo } = useDeployedContractInfo({ contractName: "LegacyFeeBurner" });
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
          <div className="text-sm space-y-2">
            {contractInfo?.address && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Contract:</span>
                <Address address={contractInfo.address} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-semibold">Owner:</span>
              <Address address={currentOwner as `0x${string}`} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Operator:</span>
              <Address address={currentOperator as `0x${string}`} />
            </div>
            {liveToken && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Token:</span>
                <Address address={liveToken as `0x${string}`} />
              </div>
            )}
            {liveSafe && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Safe:</span>
                <Address address={liveSafe as `0x${string}`} />
              </div>
            )}
            {liveBurnEngine && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">BurnEngine:</span>
                <Address address={liveBurnEngine as `0x${string}`} />
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
                <AddressInput placeholder="0x… or ENS name" value={newCreatorAddr} onChange={setNewCreatorAddr} />
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
                <AddressInput placeholder="0x… or ENS name" value={newOperatorAddr} onChange={setNewOperatorAddr} />
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
                <AddressInput placeholder="0x… or ENS name" value={newOwnerAddr} onChange={setNewOwnerAddr} />
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
