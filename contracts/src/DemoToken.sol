// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DemoToken
 * @author ChainIndex Team
 * @notice A minimal, standard-compliant ERC-20 token built exclusively to demonstrate Transfer event indexing.
 * @dev Intentionally simple: no tokenomics, no staking, no liquidity pools, no fee mechanisms.
 *      Exposes standard transfer and a public mint function to generate test Transfer events on Base Sepolia.
 */
contract DemoToken {
    // =========================================================================
    // METADATA
    // =========================================================================

    string public constant name = "ChainIndex Demo Token";
    string public constant symbol = "CIDX";
    uint8 public constant decimals = 18;

    // =========================================================================
    // STATE
    // =========================================================================

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // =========================================================================
    // CUSTOM ERRORS
    // =========================================================================

    error InsufficientBalance(address account, uint256 available, uint256 required);
    error InsufficientAllowance(address spender, uint256 currentAllowance, uint256 needed);
    error InvalidRecipient(address recipient);

    // =========================================================================
    // EVENTS
    // =========================================================================
    // WHY THE ERC-20 TRANSFER EVENT IS UBIQUITOUS:
    // The Transfer event is the most frequently indexed event in all of Web3.
    // Indexers reconstruct account balances, token volume, holders, and transfer
    // history entirely from these logs without needing to query every account's
    // balance on-chain.
    //
    // Notice the parameter structure:
    // - `from` (indexed): Sender address (or address(0) during a mint).
    // - `to` (indexed): Recipient address (or address(0) during a burn).
    // - `value` (non-indexed): uint256 amount of tokens transferred in atomic base units.
    //
    // WHY BIGINT IS MANDATORY OFF-CHAIN:
    // Solidity's `uint256` can represent numbers up to ~1.15 x 10^77.
    // JavaScript's standard `Number` type loses precision above 2^53 - 1 (9,007,199,254,740,991).
    // An amount of 10,000 tokens with 18 decimals is 10,000 * 10^18 = 10^22 base units.
    // If a JavaScript indexer parses this into a standard Number, it corrupts the value.
    // Therefore, indexers (Ponder, viem, PostgreSQL) MUST use `bigint` and `numeric/numeric-safe` types.

    /**
     * @notice Emitted whenever tokens are transferred from one account to another,
     *         or minted (from = address(0)), or burned (to = address(0)).
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @notice Emitted whenever an owner approves a spender to spend tokens.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    /**
     * @notice Deploys DemoToken and optionally mints an initial supply to the deployer.
     * @param initialSupply Amount of tokens to mint initially to msg.sender (e.g., 1000 * 10^18).
     */
    constructor(uint256 initialSupply) {
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }

    // =========================================================================
    // CORE ERC-20 FUNCTIONS
    // =========================================================================

    /**
     * @notice Transfers `amount` tokens from the caller to `recipient`.
     * @param recipient The address receiving the tokens.
     * @param amount The quantity in base units (wei equivalent).
     * @return success True if the transfer succeeded.
     */
    function transfer(address recipient, uint256 amount) external returns (bool) {
        if (recipient == address(0)) revert InvalidRecipient(recipient);
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    /**
     * @notice Approves `spender` to withdraw tokens from the caller's account.
     * @param spender The address authorized to spend tokens.
     * @param amount The maximum allowance allowed.
     * @return success True if approval succeeded.
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Transfers `amount` tokens from `sender` to `recipient` using the allowance mechanism.
     * @param sender The address from which tokens are debited.
     * @param recipient The address receiving tokens.
     * @param amount The quantity to transfer.
     * @return success True if successful.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool) {
        if (recipient == address(0)) revert InvalidRecipient(recipient);

        uint256 currentAllowance = allowance[sender][msg.sender];
        if (currentAllowance < amount) {
            revert InsufficientAllowance(msg.sender, currentAllowance, amount);
        }

        // Reduce allowance (unless infinite uint256 max)
        unchecked {
            if (currentAllowance != type(uint256).max) {
                allowance[sender][msg.sender] = currentAllowance - amount;
            }
        }

        _transfer(sender, recipient, amount);
        return true;
    }

    // =========================================================================
    // CONVENIENCE MINT FUNCTION (FOR DEMO / TESTING)
    // =========================================================================

    /**
     * @notice Public testnet mint function allowing anyone to mint demo tokens.
     * @dev Exists exclusively to enable easy testing of Transfer event indexing on Base Sepolia.
     * @param to Recipient address for the newly minted tokens.
     * @param amount Number of tokens in base units (e.g. 100 * 10^18).
     */
    function mint(address to, uint256 amount) external {
        if (to == address(0)) revert InvalidRecipient(to);
        _mint(to, amount);
    }

    // =========================================================================
    // INTERNAL LOGIC
    // =========================================================================

    function _transfer(address from, address to, uint256 amount) internal {
        uint256 senderBal = balanceOf[from];
        if (senderBal < amount) {
            revert InsufficientBalance(from, senderBal, amount);
        }

        unchecked {
            balanceOf[from] = senderBal - amount;
            balanceOf[to] += amount;
        }

        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        unchecked {
            balanceOf[to] += amount;
        }

        emit Transfer(address(0), to, amount);
    }
}
