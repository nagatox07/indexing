// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DataRegistry} from "../src/DataRegistry.sol";

contract DataRegistryTest is Test {
    DataRegistry public registry;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    // Re-declare events to test with vm.expectEmit
    event RecordCreated(
        uint256 indexed recordId,
        address indexed owner,
        string title,
        string content,
        uint256 timestamp
    );

    event RecordUpdated(
        uint256 indexed recordId,
        address indexed owner,
        string title,
        string content,
        uint256 timestamp
    );

    event RecordDeleted(
        uint256 indexed recordId,
        address indexed owner,
        uint256 timestamp
    );

    function setUp() public {
        registry = new DataRegistry();
    }

    function test_CreateRecord() public {
        vm.prank(alice);

        // Expect RecordCreated event:
        // checkTopic1 (recordId), checkTopic2 (owner), checkTopic3 (false), checkData (true)
        vm.expectEmit(true, true, false, true);
        emit RecordCreated(1, alice, "First Note", "Hello Blockchain", block.timestamp);

        uint256 id = registry.createRecord("First Note", "Hello Blockchain");
        assertEq(id, 1, "First record ID should be 1");

        (
            uint256 recordId,
            address owner,
            string memory title,
            string memory content,
            uint256 createdAt,
            uint256 updatedAt,
            bool exists
        ) = registry.getRecord(1);

        assertEq(recordId, 1);
        assertEq(owner, alice);
        assertEq(title, "First Note");
        assertEq(content, "Hello Blockchain");
        assertEq(createdAt, block.timestamp);
        assertEq(updatedAt, block.timestamp);
        assertTrue(exists);
        assertEq(registry.totalRecordsCreated(), 1);
    }

    function test_UpdateRecord() public {
        vm.prank(alice);
        uint256 id = registry.createRecord("Initial Title", "Initial Content");

        // Warp time by 1 hour to test updated timestamp
        uint256 nextTime = block.timestamp + 3600;
        vm.warp(nextTime);

        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit RecordUpdated(id, alice, "Updated Title", "Updated Content", nextTime);

        registry.updateRecord(id, "Updated Title", "Updated Content");

        (
            ,
            address owner,
            string memory title,
            string memory content,
            uint256 createdAt,
            uint256 updatedAt,
            bool exists
        ) = registry.getRecord(id);

        assertEq(owner, alice);
        assertEq(title, "Updated Title");
        assertEq(content, "Updated Content");
        assertEq(updatedAt, createdAt + 3600);
        assertTrue(exists);
    }

    function test_DeleteRecord() public {
        vm.prank(alice);
        uint256 id = registry.createRecord("To Be Deleted", "Ephemeral Content");

        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit RecordDeleted(id, alice, block.timestamp);

        registry.deleteRecord(id);

        (,,,,,, bool exists) = registry.getRecord(id);
        assertFalse(exists, "Record should no longer exist");
    }

    function test_RevertWhen_NonOwnerUpdates() public {
        vm.prank(alice);
        uint256 id = registry.createRecord("Alice Record", "Secrets");

        // Bob attempts to modify Alice's record
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(DataRegistry.UnauthorizedCaller.selector, id, bob, alice)
        );
        registry.updateRecord(id, "Hacked Title", "Hacked Content");
    }

    function test_RevertWhen_NonOwnerDeletes() public {
        vm.prank(alice);
        uint256 id = registry.createRecord("Alice Record", "Secrets");

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(DataRegistry.UnauthorizedCaller.selector, id, bob, alice)
        );
        registry.deleteRecord(id);
    }

    function test_RevertWhen_RecordNotFound() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(DataRegistry.RecordNotFound.selector, 999)
        );
        registry.updateRecord(999, "Title", "Content");
    }

    function test_RevertWhen_EmptyField() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(DataRegistry.EmptyField.selector, "title")
        );
        registry.createRecord("", "Valid Content");

        vm.expectRevert(
            abi.encodeWithSelector(DataRegistry.EmptyField.selector, "content")
        );
        registry.createRecord("Valid Title", "");
    }
}
