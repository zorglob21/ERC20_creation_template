require("@nomicfoundation/hardhat-toolbox");
const { expectRevert } = require('@openzeppelin/test-helpers');
const {hre, ethers, waffle} = require("hardhat");
const { expect } = require("chai");

let owner, addr2, addr3, provider, erc20_custom, totalSupply, pairAddress, apexAddress, erc20Address, apex, 
pairContract, routerv2, marketingWallet, marketingWallet2;
let path = [];
const routerV2Address = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
const factoryV2Address = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
const wethAddress= '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

//test deployment + liquidity creation + trading + liquidity removal + needed token function + taxes with automated sales and sending

describe('deploying, creating a lp, trading and withdrawing liquidities on an ERC20 token', function(){
it("deploying contracts", async function(){

  [owner, addr2, addr3, marketingWallet2] = await ethers.getSigners();
  console.log('deploying with account : ', owner.address);
  const ERC20_custom = await ethers.getContractFactory("CustomERC20");

  totalSupply = ethers.parseEther('1000000');

  erc20_custom = await ERC20_custom.deploy("ERC20_custom", 't1',
  totalSupply, '0x0000000000000000000000000000000000000000', owner.address, marketingWallet2.address, routerV2Address,
  wethAddress, factoryV2Address);

  const Apex = await ethers.getContractFactory("ApexToken");

  apex = await Apex.deploy(totalSupply);
  apexAddress = apex.target;
  console.log('Apex token deployed to :', apexAddress);

  erc20Address = erc20_custom.target;
  console.log('ERC20custom deployed to :', erc20Address);

  const ownerBalance = await erc20_custom.balanceOf(owner.address);
  expect(ownerBalance, 'owner balance should be equal to total supply after deploying').to.be.equal(totalSupply);
})

it("creating a lp and adding liquidities", async function(){
  provider = ethers.provider;

  const {abi : routerV2Abi} = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json")
  routerv2 = new ethers.Contract(routerV2Address, routerV2Abi, owner);

  await erc20_custom.approve(routerV2Address, totalSupply);

  let blockNumber = await provider.getBlockNumber();  
  // Get the block information for the current block
  let block = await provider.getBlock(blockNumber); 
  // Extract the timestamp from the block
  let deadline = block.timestamp + 60*10;
  let ethValue = ethers.parseEther('10');

  const pairCreation = await routerv2.addLiquidityETH(erc20Address,
  totalSupply, 0, 0, owner.address, deadline,{value : ethValue});

 
  const factoryAbi = require("../ABI/uniswapV2factory.json");
  const factoryV2 = new ethers.Contract(factoryV2Address, factoryAbi, provider);

  pairAddress = await factoryV2.getPair(erc20Address, wethAddress); 

  await erc20_custom.setPoolList(pairAddress, true);

  //pairContract = IUniswapV2Pair(pairAddress);
  const pairBalance = await erc20_custom.balanceOf(pairAddress);
  expect(pairBalance, 'pair balance should be equal to total supply').to.be.equal(totalSupply)
  //expect()*/
})

it("buying the token", async function(){

  path= [wethAddress, erc20Address];
  let blockNumber = await provider.getBlockNumber();  
  // Get the block information for the current block
  let block = await provider.getBlock(blockNumber); 
  // Extract the timestamp from the block
  let deadline = block.timestamp + 60*10;
  let ethValue = ethers.parseEther('3');
  let amountOut = await routerv2.getAmountsOut(ethValue, path);
 
  let taxPercentage = await erc20_custom.taxPercentage();
  let taxPercentage2 = await erc20_custom.taxPercentage2();

  let collectedTax = amountOut[1] * taxPercentage /BigInt(100);
  let collectedTax2 = amountOut[1] * taxPercentage2 /BigInt(100);

  marketingWallet = await erc20_custom.marketingWallet();

  marketingBal1 = await erc20_custom.marketingWalletBalance();

  let amountMinusTax = amountOut[1] - (collectedTax + collectedTax2);

  const tx = await routerv2.connect(addr2).swapExactETHForTokensSupportingFeeOnTransferTokens(
    0,
    path,
    addr2,
    deadline,
    {value : ethValue }
  );

  addr2Balance = await erc20_custom.balanceOf(addr2);
  marketingBal2 = await erc20_custom.marketingWalletBalance();
  

  expect(addr2Balance, 'problem with amount received for buyer').to.be.equal(amountMinusTax);
  expect(marketingBal2, 'tax not collected properly on buy').to.be.equal(marketingBal1 + collectedTax);
})


it("selling the token without automatic swap", async function(){

  await erc20_custom.activateAutoSell(false);

  path= [erc20Address, wethAddress];
  let blockNumber = await provider.getBlockNumber();  
  // Get the block information for the current block
  let block = await provider.getBlock(blockNumber); 
  // Extract the timestamp from the block
  let deadline = block.timestamp + 60*10;

  let amountOut = await routerv2.getAmountsOut(1000000000000, path);
 
  let taxPercentage = await erc20_custom.taxPercentage();

  let collectedTax = amountOut[1] * taxPercentage /BigInt(100);
  marketingWallet = await erc20_custom.marketingWallet();

  marketingBal1 = await erc20_custom.balanceOf(marketingWallet);

  let amountMinusTax = amountOut[1] - collectedTax;
  let addr2BalanceBeforeSwap_ = await erc20_custom.balanceOf(addr2);
  let addr2BalanceBeforeSwap = addr2BalanceBeforeSwap_ / BigInt(3);
  let addr2EthBalance1 = await ethers.provider.getBalance(addr2);

  const approval = await erc20_custom.connect(addr2).approve(routerV2Address, addr2BalanceBeforeSwap);
  //const allowance = await erc20_custom._allowances(erc20_custom.target,routerV2Address);
  //console.log('allowance :',allowance);
  const tx = await routerv2.connect(addr2).swapExactTokensForETHSupportingFeeOnTransferTokens(
    addr2BalanceBeforeSwap,
    0,
    path,
    addr2,
    deadline,
  );

  let addr2EthBalance2 = await ethers.provider.getBalance(addr2);
  let addr2BalanceAfterSwap = await erc20_custom.balanceOf(addr2);
  marketingBal2 = await erc20_custom.balanceOf(marketingWallet);
  

  expect(addr2EthBalance2, 'problem with eth received').to.be.above(addr2EthBalance1);
  expect(addr2BalanceAfterSwap, 'problem with number of token on seller address').to.be.below(addr2BalanceBeforeSwap_);
})

it("selling the token with automatic swap triggering", async function(){

  await erc20_custom.activateAutoSell(true);

  path= [erc20Address, wethAddress];
  let blockNumber = await provider.getBlockNumber();  
  // Get the block information for the current block
  let block = await provider.getBlock(blockNumber); 
  // Extract the timestamp from the block
  let deadline = block.timestamp + 60*10;

  let amountOut = await routerv2.getAmountsOut(1000000000000, path);
 
  let taxPercentage = await erc20_custom.taxPercentage();

  let collectedTax = amountOut[1] * taxPercentage /BigInt(100);
  marketingWallet = await erc20_custom.marketingWallet();

  marketingBal1 = await erc20_custom.balanceOf(marketingWallet);
  let swapTreshold = await erc20_custom.sellTreshold();
  let marketingWalletBalance = await erc20_custom.marketingWalletBalance();
  console.log(swapTreshold, marketingWalletBalance);
  expect(marketingWalletBalance, 'marketingWalletBalance not above swap treshold').to.be.above(swapTreshold)

  let amountMinusTax = amountOut[1] - collectedTax;
  let addr2BalanceBeforeSwap_ = await erc20_custom.balanceOf(addr2);
  let addr2BalanceBeforeSwap = addr2BalanceBeforeSwap_ / BigInt(3);
  let addr2EthBalance1 = await ethers.provider.getBalance(addr2);

  const approval = await erc20_custom.connect(addr2).approve(routerV2Address, addr2BalanceBeforeSwap);
  //const allowance = await erc20_custom._allowances(erc20_custom.target,routerV2Address);
  //console.log('allowance :',allowance);
  const tx = await routerv2.connect(addr2).swapExactTokensForETHSupportingFeeOnTransferTokens(
    addr2BalanceBeforeSwap,
    0,
    path,
    addr2,
    deadline,
  );

  let addr2EthBalance2 = await ethers.provider.getBalance(addr2);
  let addr2BalanceAfterSwap = await erc20_custom.balanceOf(addr2);
  marketingBal2 = await erc20_custom.balanceOf(marketingWallet);
  

  expect(addr2EthBalance2, 'problem with eth received').to.be.above(addr2EthBalance1);
  expect(addr2BalanceAfterSwap, 'problem with number of token on seller address').to.be.below(addr2BalanceBeforeSwap_);
})


it('testing automatic swap function outside of a sell',async function(){
  await erc20_custom.setRequiredTokenMode(false);
  let marketingWallet2EthBalance = await ethers.provider.getBalance(await erc20_custom.marketingWallet2());
  let path = await erc20_custom.path(0);
  let path1 = await erc20_custom.path(1);
  let markWalletBal =  await erc20_custom.marketingWallet2Balance();
  let markWallet2Bal = await erc20_custom.marketingWalletBalance();
  let amountTokensToSwap = markWallet2Bal + markWalletBal;
  let contractTokBal = await erc20_custom.balanceOf(erc20_custom.target);
  console.log('marketingWallet2EthBalance :', marketingWallet2EthBalance,
  'path[] :' , path, path1, '\n amount tokens to swap :', amountTokensToSwap,
  '\n Contract token balance:', contractTokBal);
  await erc20_custom.test_swapMarketingTokensForEth();
  
  let marketingWallet2EthBalance2 = await ethers.provider.getBalance(await erc20_custom.marketingWallet2());
 
})

it("setting required token and try selling without it", async function(){

  await erc20_custom.setRequiredToken(apexAddress);
  await erc20_custom.setRequiredTokenMode(true);

  path= [erc20Address,wethAddress];
  let blockNumber = await provider.getBlockNumber();  
  // Get the block information for the current block
  let block = await provider.getBlock(blockNumber); 
  // Extract the timestamp from the block
  let deadline = block.timestamp + 60*10;
 
  let addr2BalanceBeforeSwap_ = await erc20_custom.balanceOf(addr2);
  let addr2BalanceBeforeSwap = addr2BalanceBeforeSwap_ / BigInt(3);
 
  await erc20_custom.connect(addr2).approve(routerV2Address, addr2BalanceBeforeSwap_);
  
  const tx = routerv2.connect(addr2).swapExactTokensForETHSupportingFeeOnTransferTokens(
    addr2BalanceBeforeSwap,
    0,
    path,
    addr2,
    deadline,
  );

 await expectRevert.unspecified(tx);
})

it("selling the token with enough apex token should work", async function(){


  await apex.transfer(addr2, 100000);

  path= [erc20Address,wethAddress];
  let blockNumber = await provider.getBlockNumber();  
  // Get the block information for the current block
  let block = await provider.getBlock(blockNumber); 
  // Extract the timestamp from the block
  let deadline = block.timestamp + 60*10;
 
  let addr2BalanceBeforeSwap_ = await erc20_custom.balanceOf(addr2);
  let addr2BalanceBeforeSwap = addr2BalanceBeforeSwap_ / BigInt(3);
  let addr2EthBalance1 = await ethers.provider.getBalance(addr2);

  await erc20_custom.connect(addr2).approve(routerV2Address, addr2BalanceBeforeSwap);

  const tx = await routerv2.connect(addr2).swapExactTokensForETHSupportingFeeOnTransferTokens(
    addr2BalanceBeforeSwap,
    0,
    path,
    addr2,
    deadline,
  );

let addr2EthBalance2 = await ethers.provider.getBalance(addr2);
let addr2BalanceAfterSwap = await erc20_custom.balanceOf(addr2);

expect(addr2EthBalance2, 'problem with eth received').to.be.above(addr2EthBalance1);
expect(addr2BalanceAfterSwap, 'sell with apex token not working well').to.be.below(addr2BalanceBeforeSwap_);

})

it("withdrawing liquidities from owner account", async function(){

  let blockNumber = await provider.getBlockNumber();  
  // Get the block information for the current block
  let block = await provider.getBlock(blockNumber); 
  // Extract the timestamp from the block
  let deadline = block.timestamp + 60*10;
  let {abi : pairAbi} = require("@uniswap/v2-core/build/UniswapV2Pair.json");

  pairContract = new ethers.Contract(pairAddress, pairAbi, owner);
  
  let lpTokensBal = await pairContract.balanceOf(owner.address);

  let pairTokenBal = await erc20_custom.balanceOf(pairAddress);
  let pairEthBal = await ethers.provider.getBalance(pairAddress);
  let ownerBalance1 = await erc20_custom.balanceOf(owner.address);
  let ownerEthBalance1 = await ethers.provider.getBalance(owner.address);

  //console.log(lpTokensBal, pairTokenBal, pairEthBal, ownerBalance1);

  const approval = await pairContract.approve(routerV2Address, lpTokensBal);

  const liquidityRemoval = await routerv2.removeLiquidityETH(erc20Address,
  (lpTokensBal/BigInt(2)), 0, 0, owner.address, deadline);

  let ownerBalance2 = await erc20_custom.balanceOf(owner.address);
  let ownerEthBalance2 = await ethers.provider.getBalance(owner.address);

  //pairContract = IUniswapV2Pair(pairAddress);

  expect(ownerBalance2, 'tokens not received properly when withdrawing liquidities').to.be.above(ownerBalance1);
  expect(ownerEthBalance2, 'eth not received properly when withdrawing liquidities').to.be.above(ownerEthBalance1)
  //expect()*/
})

})
/*
it('creating pair', async function(){

})
*/