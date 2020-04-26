---
marp: true
theme: gaia
class:
  - lead
---
# Block Timestamp Manipulation

```
contract Roulette {
    uint public pastBlockTime; // forces one bet per block 

    constructor() public payable {} // initially fund contract

    // fallback function used to make a bet
    function () public payable {
        require(msg.value == 10 ether); // must send 10 ether to play
        require(now != pastBlockTime);  // only 1 transaction per block
        pastBlockTime = now;
        if(now % 15 == 0) { // winner
            msg.sender.transfer(this.balance);
        } 
    }
}
```
---
# Preventative Techniques

It is sometimes recommended to use `block.number` and an average block time to estimate times; with a `10 second block time`, 1 week equates to approximately, 60480 blocks. Thus, specifying a block number at which to change a contract state can be more secure, as miners are unable easily to manipulate the block number.

---
# Block Timestamp Manipulation in depth
```go
// miner/worker.go Line-834 
if parent.Time() >= uint64(timestamp) {
    timestamp = int64(parent.Time() + 1)
}
// this will ensure we're not going off too far in the future
if now := time.Now().Unix(); timestamp > now+1 {
    wait := time.Duration(timestamp-now) * time.Second
    log.Info("Mining too far in the future", "wait", common.PrettyDuration(wait))
    time.Sleep(wait)
}
```
[timestamp setup in go-etheurem](https://github.com/ethereum/go-ethereum/blob/b9df7ecdc3d3685180ceb29665bab59e9f614da5/miner/worker.go#L834)


---
# History of Ethereum Security Vulnerabilities, Hacks and Their Fixs

https://applicature.com/blog/blockchain-technology/history-of-ethereum-security-vulnerabilities-hacks-and-their-fixes

---
# Constructors with Care

```javascript
contract OwnerWallet {
    address public owner; 
    // constructor's name doest match the name of the contract.
    function ownerWallet(address _owner) public {
        owner = _owner;
    }

    // Fallback. Collect ether
    function() payable {}

    function withdraw() public {
        require(msg.sender == owner);
        msg.sender.transfer(this.balance);
    }
 }
```
---
# Preventative Techniques

A new keyword `constructor` that specifies the constructor. 
```javascript
pragma solidity >=0.4.22;

contract OwnerWallet {
    address public owner; 
 
    function constructor(address _owner) public {
        owner = _owner;
    }
 }
```
---
# Uninitialized Storage Pointers
```javascript 
// NameRegistrar.sol, A locked name registrar
contract NameRegistrar {
    bool public unlocked = false; // registrar locked, no name updates
    struct NameRecord {// map hashes to addresses 
        bytes32 name;
        address mappedAddress;
    }
    // records who registered names
    mapping(address => NameRecord) public registeredNameRecord;
    // resolves hashes to addresses
    mapping(bytes32 => address) public resolve;

    function register(bytes32 _name, address _mappedAddress) public {
        NameRecord newRecord;
        newRecord.name = _name;
        newRecord.mappedAddress = _mappedAddress;
        resolve[_name] = _mappedAddress; 
        registeredNameRecord[msg.sender] = newRecord;
        require(unlocked); // only allow registrations if contract is unlocked
    }
 }
```
存储模式??

---
# Preventative Techniques
The Solidity compiler shows **a warning** for unintialized storage variables; developers should pay careful attention to these warnings when building smart contracts. The current version of Mist (0.10) doesn’t allow these contracts to be compiled. It is often good practice to explicitly use the memory or storage specifiers when dealing with complex types, to ensure they behave as expected.

---
# Floating Point and Precision
```javascript
contract FunWithNumbers {
    unit constant public tokensPerEth = 10;
    uint constant public weiPerEth = 1e18;
    mapping(address => uint) public balances;

    function buyTokens() public payable {
        // convert wei to eth, then multiply by token rate
        // less than 1 ether results in 0;
        uint tokens = msg.value/weiPerEth*tokensPerEth;
        balances[msg.sender] += tokens;
    }

    function sellTokens(uint tokens) public {
        require(balances[msg.sender] >= tokens);
        uint eth = tokens/tokensPerEth; // less than 1 ether results in 0
        balances[msg.sender] -= tokens;
        msg.sender.transfer(eth*weiPerEth);
    }
}

```

---
# Preventative Techniques
1. larger numrator: `msg.value/weiPerTokens`, i.e. `weiPerTokens=1e17`
2. performed the multiplication first and then the division: `msg.value*tokenPerEth/weiPerEth`
3.   higher precision in mathematical operations, then convert back down to the precision required for output. [ds-math](https://github.com/dapphub/ds-math)
```javascript 
uint constant WAD = 10 ** 18;
// wmul function
z = add(mul(x, y), WAD / 2) / WAD; // rounds to zero if x*y < WAD / 2

wmul(1.1 ether, 2.2 ether) == 2.42 ether
``` 


---
# Tx.Origin Authentication
```javascript
// Phishable.sol
contract Phishable {
    address public owner;

    constructor (address _owner) {
        owner = _owner;
    }

    function () public payable {} // collect ether

    function withdrawAll(address _recipient) public {
        require(tx.origin == owner);
        _recipient.transfer(this.balance);
    }
}
```

---
# Tx.Origin Attack
```javascript
import "Phishable.sol"
contract AttackContract {
    Phishable phishableContract;
    address attacker; // The attacker's address to receive funds

    constructor (Phishable _phishableContract, address _attackerAddress) {
        phishableContract = _phishableContract;
        attacker = _attackerAddress;
    }

    function () payable {
        phishableContract.withdrawAll(attacker);
    }
}
```

---
# Preventative Techniques

tx.origin should not be used for authorization in smart contracts.

For example, if one wanted to deny external contracts from calling the current contract, one could implement a require of the form `require(tx.origin == msg.sender)`. This prevents intermediate contracts being used to call the current contract, limiting the contract to regular codeless addresses.

---
# Contract Libraries

openzeppelin off-chain libraries: https://openzeppelin.com/contracts/

openzeppelin on-chain libraries: https://openzeppelin.com/sdk/

---
# Preventative Techniques
In cryptography, this is so important it has been condensed into an adage: **“Don’t roll your own crypto.”** In the case of smart contracts, this amounts to gaining as much as possible from freely available libraries that have been thoroughly vetted by the community.
