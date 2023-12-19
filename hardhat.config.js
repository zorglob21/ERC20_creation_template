require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require('dotenv').config({path: __dirname +'\\.env'});

module.exports = {
  defaultNetwork: "localhost",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      forking: {
        url:"https://goerli.infura.io/v3/"+process.env.INFURA_API_KEY
      }
    },
    hardhat: {
      /**forking:{
        url : infuraEndPointURL,
      }*/
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s3.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [process.env.PRIVATE_KEY]
    },
    mainnet: {
      url: "https://bsc-dataseed.bnbchain.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [process.env.PRIVATE_KEY]
    },
    sepolia:{
      url: "https://sepolia.infura.io/v3/"+process.env.INFURA_API_KEY,
      chainId: 11155111,
      gas : 30000000,
      accounts: [process.env.PRIVATE_KEY]
    },
    goerli:{
      url: "https://goerli.infura.io/v3/"+process.env.INFURA_API_KEY,
      chainId: 5,
      gas : 30000000,
      accounts: [process.env.PRIVATE_KEY]
    },
    avax:{   
      url: "https://avalanche-mainnet.infura.io/v3/"+process.env.INFURA_API_KEY,
      chainId: 43114,
      gas : 30000000,
      accounts: [process.env.PRIVATE_KEY] },

    fuji:{
      url: "https://avalanche-fuji.infura.io/v3/"+process.env.INFURA_API_KEY,
      chainId: 43113,
      gas : 30000000,
      accounts: [process.env.PRIVATE_KEY]
    },
  },
  etherscan: {
    
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  solidity: {
  compilers :[{
  version: "0.6.12",
  settings: {
    optimizer: {
      enabled: true
    }
   }},
   {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true
      }
     }}
  ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 20000
  }
};