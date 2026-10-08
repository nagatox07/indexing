// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DataRegistry
 * @author ChainIndex Team
 * @notice A lightweight registry smart contract designed for educational and production indexing.
 * @dev Allows users to create, update, and delete arbitrary data records.
 *      Each state transition emits a corresponding EVM event with rich metadata,
 *      demonstrating how off-chain indexing engines (like Ponder) capture protocol lifecycle events.
 */
contract DataRegistry {
    // =========================================================================
    // STRUCTS & DATA TYPES
    // =========================================================================

    /**
     * @notice Represents an individual data record stored on-chain.
     * @param id Unique incremental identifier for the record.
     * @param owner The Ethereum address that created and controls the record.
     * @param title A short human-readable title or tag for the record.
     * @param content Arbitrary string payload (e.g., JSON string, URI, or note).
     * @param createdAt Unix timestamp (seconds) when the record was first created.
     * @param updatedAt Unix timestamp (seconds) when the record was last modified.
     * @param exists Boolean flag indicating whether the record currently exists (not deleted).
     */
    struct Record {
        uint256 id;
        address owner;
        string title;
        string content;
        uint256 createdAt;
        uint256 updatedAt;
        bool exists;
    }

    // =========================================================================
    // STATE VARIABLES
    // =========================================================================

    /// @notice Monotonically increasing counter used to generate unique record IDs.
    uint256 public nextRecordId = 1;

    /// @notice Mapping from record ID to the Record data structure.
    mapping(uint256 => Record) private _records;

    // =========================================================================
    // CUSTOM ERRORS
    // =========================================================================
    // WHY CUSTOM ERRORS: In modern Solidity (>=0.8.4), custom errors are significantly
    // cheaper in gas than require() strings because they only encode a 4-byte selector
    // instead of storing long ASCII strings in bytecode.

    /// @notice Thrown when attempting an operation on a non-existent or deleted record.
    error RecordNotFound(uint256 recordId);

    /// @notice Thrown when an account other than the record owner attempts a modification.
    error UnauthorizedCaller(uint256 recordId, address caller, address owner);

    /// @notice Thrown when title or content string is empty during record creation.
    error EmptyField(string fieldName);

    // =========================================================================
    // EVENTS
    // =========================================================================
    // WHY BLOCKCHAIN EVENTS MATTER:
    // Smart contract storage is expensive to read from off-chain nodes if you need
    // historical timelines, relationships, or complex filtering.
    // Events are cheap log entries stored in EVM receipt tries, not contract storage.
    // Indexing engines (like Ponder) listen for these events via RPC to build fast,
    // queryable relational databases (PostgreSQL) and APIs (GraphQL/REST).
    //
    // WHY "indexed" PARAMETERS:
    // In the EVM, an event can have up to 3 "indexed" parameters.
    // - Indexed arguments become 32-byte ❝topics❞ (filterable by RPC nodes using eth_getLogs).
    // - Non-indexed arguments (like string title, string content, timestamp) are packed into
    //   the log's ❝data❞ field and decoded off-chain using the contract's ABI.
    // Here, indexing `recordId` and `owner` lets external indexers query:
    // "Give me all events for record #5" or "Give me all events created by Alice".

    /**
     * @notice Emitted whenever a new record is created.
     * @param recordId The unique ID assigned to the new record (indexed for filtering).
     * @param owner The address of the creator (indexed for filtering by user).
     * @param title The title of the record.
     * @param content The text content or payload.
     * @param timestamp The block timestamp at creation time.
     */
    event RecordCreated(
        uint256 indexed recordId,
        address indexed owner,
        string title,
        string content,
        uint256 timestamp
    );

    /**
     * @notice Emitted whenever an existing record is updated.
     * @param recordId The ID of the modified record (indexed).
     * @param owner The address of the record owner (indexed).
     * @param title The updated title of the record.
     * @param content The updated content payload.
     * @param timestamp The block timestamp when the update occurred.
     */
    event RecordUpdated(
        uint256 indexed recordId,
        address indexed owner,
        string title,
        string content,
        uint256 timestamp
    );

    /**
     * @notice Emitted whenever a record is deleted by its owner.
     * @param recordId The ID of the deleted record (indexed).
     * @param owner The address of the record owner (indexed).
     * @param timestamp The block timestamp when deletion occurred.
     */
    event RecordDeleted(
        uint256 indexed recordId,
        address indexed owner,
        uint256 timestamp
    );

    // =========================================================================
    // EXTERNAL WRITE FUNCTIONS
    // =========================================================================

    /**
     * @notice Creates a new record in the registry and assigns it a unique ID.
     * @dev Increments `nextRecordId` and emits {RecordCreated}.
     * @param title Short title or description for the record.
     * @param content The primary text/metadata payload.
     * @return recordId The newly assigned identifier.
     */
    function createRecord(
        string calldata title,
        string calldata content
    ) external returns (uint256 recordId) {
        if (bytes(title).length == 0) revert EmptyField("title");
        if (bytes(content).length == 0) revert EmptyField("content");

        recordId = nextRecordId;
        nextRecordId++;

        uint256 currentTime = block.timestamp;

        _records[recordId] = Record({
            id: recordId,
            owner: msg.sender,
            title: title,
            content: content,
            createdAt: currentTime,
            updatedAt: currentTime,
            exists: true
        });

        emit RecordCreated(
            recordId,
            msg.sender,
            title,
            content,
            currentTime
        );
    }

    /**
     * @notice Updates the title and content of an existing record.
     * @dev Reverts if the caller is not the owner or if the record does not exist.
     *      Emits {RecordUpdated}.
     * @param recordId The ID of the record to update.
     * @param title The new title.
     * @param content The new content.
     */
    function updateRecord(
        uint256 recordId,
        string calldata title,
        string calldata content
    ) external {
        Record storage rec = _records[recordId];

        if (!rec.exists) revert RecordNotFound(recordId);
        if (rec.owner != msg.sender) revert UnauthorizedCaller(recordId, msg.sender, rec.owner);
        if (bytes(title).length == 0) revert EmptyField("title");
        if (bytes(content).length == 0) revert EmptyField("content");

        rec.title = title;
        rec.content = content;
        rec.updatedAt = block.timestamp;

        emit RecordUpdated(
            recordId,
            msg.sender,
            title,
            content,
            rec.updatedAt
        );
    }

    /**
     * @notice Marks an existing record as deleted.
     * @dev Only the owner can delete the record.
     *      Deletes the storage slot to refund gas and sets `exists` to false.
     *      Emits {RecordDeleted}.
     * @param recordId The ID of the record to delete.
     */
    function deleteRecord(uint256 recordId) external {
        Record storage rec = _records[recordId];

        if (!rec.exists) revert RecordNotFound(recordId);
        if (rec.owner != msg.sender) revert UnauthorizedCaller(recordId, msg.sender, rec.owner);

        // Delete the record from storage
        delete _records[recordId];

        emit RecordDeleted(
            recordId,
            msg.sender,
            block.timestamp
        );
    }

    // =========================================================================
    // EXTERNAL VIEW FUNCTIONS
    // =========================================================================

    /**
     * @notice Retrieves record details by record ID.
     * @param recordId The unique ID of the record.
     * @return id The record ID.
     * @return owner The record owner address.
     * @return title The record title.
     * @return content The record content payload.
     * @return createdAt Unix creation timestamp.
     * @return updatedAt Unix last modified timestamp.
     * @return exists True if the record exists, false if non-existent or deleted.
     */
    function getRecord(uint256 recordId)
        external
        view
        returns (
            uint256 id,
            address owner,
            string memory title,
            string memory content,
            uint256 createdAt,
            uint256 updatedAt,
            bool exists
        )
    {
        Record storage rec = _records[recordId];
        return (
            rec.id,
            rec.owner,
            rec.title,
            rec.content,
            rec.createdAt,
            rec.updatedAt,
            rec.exists
        );
    }

    /**
     * @notice Returns total number of records ever created.
     * @dev Since IDs start at 1, total created equals `nextRecordId - 1`.
     */
    function totalRecordsCreated() external view returns (uint256) {
        return nextRecordId - 1;
    }
}
