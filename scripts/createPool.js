require("@nomicfoundation/hardhat-toolbox");
const {hre, ethers, waffle} = require("hardhat");
const fs = require("fs");

const paramsFile = fs.readFileSync("./params.json");
const params = JSON.parse(paramsFile);

const factoryV2Address = params.networks[network.name].factoryAddress;
const routerV2Address = params.networks[network.name].routerAddress;
const wethAddress = params.networks[network.name].wbnbAddress;

// to create a LP for the custom token

async function main() {

  const [owner] = await ethers.getSigners();
  const provider = ethers.provider;
 
  const ERC20Address = '0x012c5B822093dA846aadC03068942d34c21518E4';


  const {abi : routerV2Abi} = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json")
  const routerv2 = new ethers.Contract(routerV2Address, routerV2Abi, owner);
  const totalSupply = ethers.parseEther('10000000');

  const { abi : ERC20Abi } = require("../artifacts/contracts/ERC20_Custom.sol/CustomERC20.json");
  const Erc20 = new ethers.Contract(ERC20Address, ERC20Abi, owner)

  const approval = await Erc20.approve(routerV2Address, totalSupply);
  await approval.wait(5);

  let blockNumber = await provider.getBlockNumber();  
  // Get the block information for the current block
  let block = await provider.getBlock(blockNumber); 
  // Extract the timestamp from the block
  let deadline = block.timestamp + 60*10;

  const pairCreation = await routerv2.addLiquidityETH(ERC20Address,
    totalSupply,0, 0, owner.address, deadline,{value : 100000000000000});
  await pairCreation.wait(3);

  const factoryAbi = require("../ABI/uniswapV2factory.json");
  const factoryV2 = new ethers.Contract(factoryV2Address, factoryAbi, provider);

  let pairAddress = await factoryV2.getPair(ERC20Address, wethAddress); 
  await pairAddress.wait(1);
  console.log('pair address is :', pairAddress);
  const Apex = await ethers.getContractFactory("ApexToken");

  const apex = await Apex.deploy(totalSupply);
  await apex.deploymentTransaction().wait(4);
  apexAddress = apex.target;

  console.log('apex token deployed to :', apexAddress);


  let tx0 = await Erc20.setRequiredTokenMode(true);
  await tx0.wait(3);

  let tx1 = await Erc20.setRequiredToken('0x58da89bc75E4A9FF7c35b5074c2Ba752e5fb7B12');
  await tx1.wait(3);

  let tx2 = await Erc20.setPoolList('0x7a0Db0A918bb63C0Bc6d62246989564b26e14915', true);
  await tx2.wait(3);


}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
