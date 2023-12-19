require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-toolbox");
const { expectRevert } = require('@openzeppelin/test-helpers');
const {hre, ethers, waffle} = require("hardhat");
const { expect } = require("chai");
const fs = require("fs");

const paramsFile = fs.readFileSync("./params.json");
const params = JSON.parse(paramsFile);
const routerV2Address = params.networks[network.name].traderJoeRouterV2;

let owner, addr2, addr3, provider, erc20_custom, totalSupply, pairAddress, apexAddress, erc20Address, apex, 
pairContract, routerV2, marketingWallet, marketingWallet2, liquidityLocker, lockID;

provider = ethers.provider;
async function main() {
const [owner] = await ethers.getSigners();
console.log('deploying with account : ', owner.address);
console.log("Account balance:", (await owner.provider.getBalance(owner.address)).toString());   

/** 
const ERC20_custom = await ethers.getContractFactory("Avax_ERC20");
erc20_custom = await ERC20_custom.deploy(owner.address, routerV2Address);

await erc20_custom.deploymentTransaction().wait(3);

erc20Address = erc20_custom.target;
console.log('ERC20custom deployed to :', erc20Address);
*/

const LiquityLocker = await ethers.getContractFactory("HelperLocker");
liquidityLocker = await LiquityLocker.deploy(owner.address);

await liquidityLocker.deploymentTransaction().wait(3);

console.log('Liquidity locker deployed to :', liquidityLocker.target);

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
