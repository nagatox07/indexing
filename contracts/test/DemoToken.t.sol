// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DemoToken} from "../src/DemoToken.sol";

contract DemoTokenTest is Test {
    DemoToken public token;

    address public owner = address(this);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10**18;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function setUp() public {
        token = new DemoToken(INITIAL_SUPPLY);
    }

    function test_InitialSupply() public view {
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY);
        assertEq(token.decimals(), 18);
        assertEq(token.name(), "ChainIndex Demo Token");
        assertEq(token.symbol(), "CIDX");
    }

    function test_Mint() public {
        uint256 mintAmount = 500 * 10**18;

        vm.expectEmit(true, true, false, true);
        emit Transfer(address(0), alice, mintAmount);

        token.mint(alice, mintAmount);

        assertEq(token.balanceOf(alice), mintAmount);
        assertEq(token.totalSupply(), INITIAL_SUPPLY + mintAmount);
    }

    function test_Transfer() public {
        uint256 transferAmount = 100 * 10**18;

        vm.expectEmit(true, true, false, true);
        emit Transfer(owner, alice, transferAmount);

        bool success = token.transfer(alice, transferAmount);
        assertTrue(success);

        assertEq(token.balanceOf(alice), transferAmount);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY - transferAmount);
    }

    function test_TransferFrom() public {
        uint256 approvedAmount = 250 * 10**18;
        uint256 transferAmount = 100 * 10**18;

        token.approve(alice, approvedAmount);
        assertEq(token.allowance(owner, alice), approvedAmount);

        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit Transfer(owner, bob, transferAmount);

        bool success = token.transferFrom(owner, bob, transferAmount);
        assertTrue(success);

        assertEq(token.balanceOf(bob), transferAmount);
        assertEq(token.allowance(owner, alice), approvedAmount - transferAmount);
    }

    function test_RevertWhen_InsufficientBalance() public {
        uint256 excessiveAmount = INITIAL_SUPPLY + 1;

        vm.expectRevert(
            abi.encodeWithSelector(
                DemoToken.InsufficientBalance.selector,
                owner,
                INITIAL_SUPPLY,
                excessiveAmount
            )
        );
        token.transfer(alice, excessiveAmount);
    }
}
