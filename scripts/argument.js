require("@nomicfoundation/hardhat-toolbox");
const {hre, ethers, waffle} = require("hardhat");
const fs = require("fs");

const paramsFile = fs.readFileSync("./params.json");
const params = JSON.parse(paramsFile);

const factoryV2Address = params.networks[network.name].factoryV2Address;
const routerV2Address = params.networks[network.name].routerV2Address;
const wethAddress = params.networks[network.name].wethAddress;



const totalSupply = ethers.parseEther('10000000');
module.exports = [
  "ERC20_custom", 't1', totalSupply, '0x0000000000000000000000000000000000000000', '0xBBa98Cefde0bE9Eb9523fB4ea21e273d16e09332', '0x2b08b5cD22ACb7686f62dA423c2b83dfa591De66', routerV2Address
];
