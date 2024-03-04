// SPDX-License-Identifier: Apache-2.0
// OpenZeppelin Contracts (last updated v5.0.0) (token/ERC20/ERC20.sol)

pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {IUniswapV2Router02} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import {IUniswapV2Pair} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import {IUniswapV2Factory} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
/**
 * @dev Implementation of the {IERC20} interface.
 *
 * This implementation is agnostic to the way tokens are created. This means
 * that a supply mechanism has to be added in a derived contract using {_mint}.
 *
 * TIP: For a detailed writeup see our guide
 * https://forum.openzeppelin.com/t/how-to-implement-erc20-supply-mechanisms/226[How
 * to implement supply mechanisms].
 *
 * The default value of {decimals} is 18. To change this, you should override
 * this function so it returns a different value.
 *
 * We have followed general OpenZeppelin Contracts guidelines: functions revert
 * instead returning `false` on failure. This behavior is nonetheless
 * conventional and does not conflict with the expectations of ERC20
 * applications.
 *
 * Additionally, an {Approval} event is emitted on calls to {transferFrom}.
 * This allows applications to reconstruct the allowance for all accounts just
 * by listening to said events. Other implementations of the EIP may not emit
 * these events, as it isn't required by the specification.
 */
contract CustomERC20 is Context, IERC20, IERC20Metadata, IERC20Errors, Ownable {
    mapping(address account => uint256) private _balances;

    mapping(address account => mapping(address spender => uint256)) private _allowances;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;
    address public requiredTokenAddress;

    address public marketingWallet;
    address public marketingWallet2;
    uint public marketingWalletBalance;
    uint public marketingWallet2Balance;
    bool public swapActivated = true;
    uint public sellTreshold;
    uint public sellTreshold2;

    uint public deadlineTxTime = 10; // multiplied by 60
    uint public slippage = 930; // divided by 1000
    bool public inSwap;

    address public routerAddress;
    address public wethAddress;
    address public factoryV2Address;
    address[] public path;


    uint public taxPercentage = 9;
    uint public taxPercentage2 = 1;

    IERC20 public requiredToken;
    bool public requiredTokenMode;
    uint public requiredTokenAmount = 1;
    mapping(address => bool) public isPool;


    /**
     * @dev Sets the values for {name} and {symbol}.
     *
     * All two of these values are immutable: they can only be set once during
     * construction.
     */
    constructor(string memory name_, string memory symbol_, uint totalSupply_, address requiredToken_
    , address marketingWallet_, address marketingWallet2_, address routerAddress_,
    address wethAddress_, address factoryV2Address_) Ownable(msg.sender) {
        _name = name_;
        _symbol = symbol_;
        require(totalSupply_ <= (type(uint256).max / 10000), 'total supply too big'); // to avoid overflow when calculating percentages
        _mint(msg.sender, totalSupply_);
        requiredTokenAddress = requiredToken_;
        requiredToken = IERC20(requiredTokenAddress);
        marketingWallet = marketingWallet_;
        marketingWallet2 = marketingWallet2_;
        routerAddress = routerAddress_;
        factoryV2Address = factoryV2Address_;
        wethAddress = wethAddress_;
        path.push(address(this));
        path.push(wethAddress);
        sellTreshold = totalSupply_ * 2 / 1000; //initially defined at 0,2% of supply
        sellTreshold2 = totalSupply_ * 2 / 1000;
        _approve(address(this), routerAddress, type(uint256).max);

    }

    function setPoolList(address addr_, bool value_) external onlyOwner{
        isPool[addr_] = value_;
    }
    
    function setRequiredTokenMode(bool value_) external onlyOwner{
        requiredTokenMode = value_;
    }

    function setRequiredToken(address addr_) external onlyOwner{
        requiredTokenAddress = addr_;
        requiredToken = IERC20(requiredTokenAddress);
    }

    function setRequiredTokenAmount(uint amount_) external onlyOwner{
        requiredTokenAmount = amount_;  
    }


    function setMarketingWallets(address addr_, address addr2_) external onlyOwner{
        marketingWallet = addr_;
        marketingWallet2 = addr2_;
    }

    function activateAutoSell(bool activated_) external onlyOwner{
         swapActivated = activated_ ;
    }

    function setAutoSellTresholds(uint sellTreshold_, uint sellTreshold2_) external onlyOwner{
        sellTreshold = sellTreshold_;
        sellTreshold2 = sellTreshold2_;
    }

    //Warning : don't use this function if you don't know what you're doing!! initial settings should be good
    function advancedSettingsAutomaticSell(uint slippage_, uint deadlineTx_) external onlyOwner{
        require(slippage_ >= 1 && slippage <= 1000, 'incorrect slippage values');
        slippage = slippage_;
        deadlineTxTime = deadlineTx_;
    }

    function setRouterAddress(address addr_) external onlyOwner{
        routerAddress = addr_;
        _approve(address(this), routerAddress, type(uint256).max);
    }
    /**
     * @dev Returns the name of the token.
     */
    function name() public view virtual returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5.05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the default value returned by this function, unless
     * it's overridden.
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view virtual returns (uint8) {
        return 18;
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view virtual returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view virtual returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - the caller must have a balance of at least `value`.
     */
    function transfer(address to, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, value);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view virtual returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * NOTE: If `value` is the maximum `uint256`, the allowance is not updated on
     * `transferFrom`. This is semantically equivalent to an infinite approval.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, value);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     *
     * NOTE: Does not update the allowance if the current allowance
     * is the maximum `uint256`.
     *
     * Requirements:
     *
     * - `from` and `to` cannot be the zero address.
     * - `from` must have a balance of at least `value`.
     * - the caller must have allowance for ``from``'s tokens of at least
     * `value`.
     */
    function transferFrom(address from, address to, uint256 value) public virtual returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, value);
        _transfer(from, to, value);
        return true;
    }

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to`.
     *
     * This internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * NOTE: This function is not virtual, {_update} should be overridden instead.
     */
    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        if (to == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        _update(from, to, value);
    }

    /**
     * @dev Transfers a `value` amount of tokens from `from` to `to`, or alternatively mints (or burns) if `from`
     * (or `to`) is the zero address. All customizations to transfers, mints, and burns should be done by overriding
     * this function.
     *
     * Emits a {Transfer} event.
     */
    function _update(address from, address to, uint256 value) internal virtual {

        //only on sells
        if((marketingWalletBalance >= sellTreshold || marketingWallet2Balance >= sellTreshold2) && !inSwap
            && isPool[to] && !isPool[from] && swapActivated)
            {  
                inSwap = true;  //to avoid loop if treshold is low
                _swapMarketingTokensForEth();
                inSwap = false; 
            }
        
        if (from == address(0)) {
            // Overflow check required: The rest of the code assumes that totalSupply never overflows
            _totalSupply += value;
        } else {
            uint256 fromBalance = _balances[from];
            if (fromBalance < value) {
                revert ERC20InsufficientBalance(from, fromBalance, value);
            }
            unchecked {
                // Overflow not possible: value <= fromBalance <= totalSupply.
                _balances[from] = fromBalance - value;
            }
        }

        if (to == address(0)) {
            unchecked {
                // Overflow not possible: value <= totalSupply or value <= fromBalance <= totalSupply.
                _totalSupply -= value;
                emit Transfer(from, to, value);
            }
        } 
        
        else if((isPool[to] || isPool[from])
        && from != marketingWallet 
        && to != marketingWallet
        && from != marketingWallet2 
        && to != marketingWallet2
        && from != address(0)
        && to != routerAddress
        && from != routerAddress
        && from != address(this)
        && to != address(this)) //don't apply tax to first mint, marketing wallet, transfers and liquidity withdrawal, automatic sell

        {   
            if(requiredTokenMode && isPool[to])
            {

            uint256 senderBal = requiredToken.balanceOf(from); 
            require(senderBal >= requiredTokenAmount, 'you need more of the required token to be allowed to sell');
            
            }
            
            uint taxValue = value * taxPercentage / 100;
            uint taxValue2 = value * taxPercentage2 / 100;
            uint finalAmount = value - taxValue - taxValue2;

            unchecked {
                // Overflow not possible: balance + value is at most totalSupply, which we know fits into a uint256.
               
                marketingWalletBalance += taxValue;
                marketingWallet2Balance += taxValue2;
                _balances[address(this)] += (taxValue + taxValue2);
                _balances[to] += finalAmount;

                emit Transfer(from, address(this), (taxValue + taxValue2));
                emit Transfer(from, to, finalAmount);
                
            }
            
            
        }

        else {
            
            unchecked {
                // Overflow not possible: balance + value is at most totalSupply, which we know fits into a uint256.

                _balances[to] += value;

                emit Transfer(from, to, value);
            }

        }
    
    }
    
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);    
    }
 


    function _swapMarketingTokensForEth() internal {

      
        uint amountTokens = marketingWallet2Balance + marketingWalletBalance;
        marketingWalletBalance = 0;
        marketingWallet2Balance = 0;

    
        //double check for possible bug with order of tokens;
        //get amountOutMin and set slippage for the buy transaction
        (address token0,) = sortTokens(address(this), wethAddress);
        address pairAddress = IUniswapV2Factory(factoryV2Address).getPair(address(this), wethAddress);
        (uint reserves0, uint reserves1,)= IUniswapV2Pair(pairAddress).getReserves();
        (uint reservesA, uint reservesB) = address(this) == token0 ? (reserves0, reserves1) : (reserves1, reserves0);
  
      
        uint amountOutMin =  IUniswapV2Router02(routerAddress).getAmountOut(amountTokens, reservesA, reservesB);
        uint deadline = block.timestamp + (deadlineTxTime * 1 minutes);
      
        uint[] memory amounts = IUniswapV2Router02(routerAddress).swapExactTokensForETH(amountTokens,   
        amountOutMin* slippage / 1000,
        path, 
        address(this), 
        deadline); 
 
        uint receivedEth = amounts[amounts.length - 1];

        //formula to calculate the ratio of ether to send to marketing wallets relative to their percentage
        uint marketingWalletShare = receivedEth * taxPercentage / (taxPercentage + taxPercentage2);
        uint marketingWallet2Share = receivedEth - marketingWalletShare;

        payable(marketingWallet).send(marketingWalletShare);

        payable(marketingWallet2).send(marketingWallet2Share);
        
        
    }

    receive() payable external {}
    fallback() payable external {}

    function withrawEth() external onlyOwner{

        uint contractBalance = address(this).balance;
        payable(msg.sender).transfer(contractBalance);
    }

    /**
     * @dev Creates a `value` amount of tokens and assigns them to `account`, by transferring it from address(0).
     * Relies on the `_update` mechanism
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * NOTE: This function is not virtual, {_update} should be overridden instead.
     */
    function _mint(address account, uint256 value) internal {
        if (account == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        _update(address(0), account, value);
    }

    /**
     * @dev Destroys a `value` amount of tokens from `account`, lowering the total supply.
     * Relies on the `_update` mechanism.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * NOTE: This function is not virtual, {_update} should be overridden instead
     */
    function _burn(address account, uint256 value) internal {
        if (account == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        _update(account, address(0), value);
    }

    /**
     * @dev Sets `value` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     *
     * Overrides to this logic should be done to the variant with an additional `bool emitEvent` argument.
     */
    function _approve(address owner, address spender, uint256 value) internal {
        _approve(owner, spender, value, true);
    }

    /**
     * @dev Variant of {_approve} with an optional flag to enable or disable the {Approval} event.
     *
     * By default (when calling {_approve}) the flag is set to true. On the other hand, approval changes made by
     * `_spendAllowance` during the `transferFrom` operation set the flag to false. This saves gas by not emitting any
     * `Approval` event during `transferFrom` operations.
     *
     * Anyone who wishes to continue emitting `Approval` events on the`transferFrom` operation can force the flag to
     * true using the following override:
     * ```
     * function _approve(address owner, address spender, uint256 value, bool) internal virtual override {
     *     super._approve(owner, spender, value, true);
     * }
     * ```
     *
     * Requirements are the same as {_approve}.
     */
    function _approve(address owner, address spender, uint256 value, bool emitEvent) internal virtual {
        if (owner == address(0)) {
            revert ERC20InvalidApprover(address(0));
        }
        if (spender == address(0)) {
            revert ERC20InvalidSpender(address(0));
        }
        _allowances[owner][spender] = value;
        if (emitEvent) {
            emit Approval(owner, spender, value);
        }
    }

    /**
     * @dev Updates `owner` s allowance for `spender` based on spent `value`.
     *
     * Does not update the allowance value in case of infinite allowance.
     * Revert if not enough allowance is available.
     *
     * Does not emit an {Approval} event.
     */
    function _spendAllowance(address owner, address spender, uint256 value) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < value) {
                revert ERC20InsufficientAllowance(spender, currentAllowance, value);
            }
            unchecked {
                _approve(owner, spender, currentAllowance - value, false);
            }
        }
    }
}
