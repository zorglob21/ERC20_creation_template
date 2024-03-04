pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ApexToken is ERC20, Ownable{

  constructor(uint totalSupply_) 
  ERC20('Apex', 'APX')
  Ownable(msg.sender)
  {
    _mint(msg.sender, totalSupply_);
  } 
}