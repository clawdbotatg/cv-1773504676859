// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/LegacyFeeBurner.sol";

contract DeployLegacyFeeBurner is Script {
    function run() external {
        address _owner = vm.envOr("LEGACY_OWNER", address(0xa2aD5F70B2EaccA81910561B3c1c7FfEC2B2C2B3));
        address _operator = vm.envOr("LEGACY_OPERATOR", address(0xeB99a27AD482534FBf40213d6714e130A43Db0d8));
        address _burnEngine = vm.envOr("LEGACY_BURN_ENGINE", address(0x1f068DB935DD585941eC386eB14ca595F350D63e));
        address _token = vm.envOr("LEGACY_TOKEN", address(0x2b7f32C4C05Ab1ebB3E6a5E268e343b35CDA19Db));
        address _safe = vm.envOr("LEGACY_SAFE", address(0x1eaf444ebDf6495C57aD52A04C61521bBf564ace));

        vm.startBroadcast();
        LegacyFeeBurner legacy = new LegacyFeeBurner(_owner, _operator, _burnEngine, _token, _safe);
        console.log("LegacyFeeBurner deployed at:", address(legacy));
        vm.stopBroadcast();
    }
}
