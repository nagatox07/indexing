// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DataRegistry} from "../src/DataRegistry.sol";
import {DemoToken} from "../src/DemoToken.sol";

/**
 * @title DeployScript
 * @notice Automated deployment script for Base Sepolia testnet.
 * @dev Reads the DEPLOYER_PRIVATE_KEY environment variable and deploys both contracts.
 */
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        console.log("=== CHAININDEX CONTRACT DEPLOYMENT ===");
        console.log("Deployer Address:", deployerAddress);
        console.log("Chain ID:", block.chainid);
        console.log("Current Block:", block.number);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy DataRegistry
        DataRegistry dataRegistry = new DataRegistry();
        console.log("DataRegistry deployed at:", address(dataRegistry));

        // 2. Deploy DemoToken with 1,000,000 initial tokens (18 decimals)
        uint256 initialSupply = 1_000_000 * 10**18;
        DemoToken demoToken = new DemoToken(initialSupply);
        console.log("DemoToken deployed at:", address(demoToken));

        vm.stopBroadcast();

        console.log("=== DEPLOYMENT COMPLETE ===");
    }
}
