// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/LegacyFeeBurner.sol";

contract DeployYourContract is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        address _owner = vm.envOr("LEGACY_OWNER", address(0x29c3246636977351B7F7238F77A873E62320799D));
        address _operator = vm.envOr("LEGACY_OPERATOR", address(0xfD914b2627F6CEBAa3cb76D51571eD99DA839C73));
        address _burnEngine = vm.envOr("LEGACY_BURN_ENGINE", address(0x022688aDcDc24c648F4efBa76e42CD16BD0863AB));
        address _token = vm.envOr("LEGACY_TOKEN", address(0x3d5e487B21E0569048c4D1A60E98C36e1B09DB07));
        address _safe = vm.envOr("LEGACY_SAFE", address(0x1eaf444ebDf6495C57aD52A04C61521bBf564ace));

        new LegacyFeeBurner(_owner, _operator, _burnEngine, _token, _safe);
    }
}
