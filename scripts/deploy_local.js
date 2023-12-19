require("@nomicfoundation/hardhat-toolbox");
const {hre, ethers, waffle} = require("hardhat");
const fs = require("fs");

const paramsFile = fs.readFileSync("./params.json");
const params = JSON.parse(paramsFile);

const factoryV2Address = params.networks[network.name].factoryAddress;
const routerV2Address = params.networks[network.name].routerAddress;
const wethAddress = params.networks[network.name].wbnbAddress;

async function main() {

  const network = await ethers.provider.getNetwork();
  console.log("Deploying to network:", network.name);

  const [owner] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", owner.address);   
  console.log("Account balance:", (await owner.provider.getBalance(owner.address)).toString());   
  
  const ERC20_custom = await ethers.getContractFactory("CustomERC20");
  
  const totalSupply = ethers.parseEther('10000000');

  const erc20_custom = await ERC20_custom.deploy("ERC20_custom", 't1',
  totalSupply, '0x0000000000000000000000000000000000000000', owner.address, routerV2Address);
 

  console.log('ERC20custom deployed to :', erc20_custom.target);

  const provider = ethers.provider;

  const {abi : routerV2Abi} = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json")
  const routerv2 = new ethers.Contract(routerV2Address, routerV2Abi, owner);


  const approval = await erc20_custom.approve(routerV2Address, totalSupply);


  let blockNumber = await provider.getBlockNumber();  
  // Get the block information for the current block
  let block = await provider.getBlock(blockNumber); 
  // Extract the timestamp from the block
  let deadline = block.timestamp + 60*10;

  const pairCreation = await routerv2.addLiquidityETH(erc20_custom.target,
    totalSupply,0, 0, owner.address, deadline,{value : 100000000000000});
 

  const factoryAbi = require("../ABI/uniswapV2factory.json");
  const factoryV2 = new ethers.Contract(factoryV2Address, factoryAbi, provider);

  let pairAddress = await factoryV2.getPair(erc20_custom.target, wethAddress); 

  console.log('pair address is :', pairAddress);

  const Apex = await ethers.getContractFactory("ApexToken");

  const apex = await Apex.deploy(totalSupply);

  apexAddress = apex.target;

  console.log('apex token deployed to :', apexAddress);


  let tx0 = await erc20_custom.setRequiredTokenMode(true);

  let tx1 = await erc20_custom.setRequiredToken(apexAddress);


  let tx2 = await erc20_custom.setPoolList(pairAddress, true);
 



}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
