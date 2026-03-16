import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const externalContracts = {
  8453: {
    BurnEngine: {
      address: "0x1f068DB935DD585941eC386eB14ca595F350D63e",
      abi: [
        {
          inputs: [],
          name: "executeFullCycle",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "getStatus",
          outputs: [
            { name: "totalBurned", type: "uint256", internalType: "uint256" },
            { name: "cycleCount", type: "uint256", internalType: "uint256" },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
    },
  },
} as const;

export default externalContracts satisfies GenericContractsDeclaration;
