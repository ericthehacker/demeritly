pragma solidity ^0.4.17;

contract Demeritly {
    struct User {
        address addr;
        string name;
        string email;
        uint demeritBalance;
    }

    struct Demerit {
        address sender;
        address receiver;
        uint8 amount;
        string message;
        uint timestamp;
    }

    address[] public userAddresses;
    mapping(address => User) public users;
    mapping(address => Demerit[]) public demerits;
    address creator;
    uint internal contractBalance;

    function Demeritly() public {
        creator = msg.sender; // capture creator for use later
    }

    event AddUser(address userAddress, string name, string email);

    function addUser(address userAddress, string name, string email) public {
        require(users[userAddress].addr == address(0)); // ensure user not already added

        User memory user = User(
            {
                addr: userAddress,
                name: name,
                email: email,
                demeritBalance: 0
            }
        );

        userAddresses.push(userAddress);
        users[userAddress] = user;

        AddUser(userAddress, name, email);
    }

    function getUserAddressLength() view public returns (uint) {
        return userAddresses.length;
    }

    event AddDemerit(address sender, address receiver, uint8 amount, string message, uint timestamp);

    function addDemerit(address receiver, uint8 amount, string message) public {
        // ensure both sender and receiver are users
        require(users[msg.sender].addr != address(0));
        require(users[receiver].addr != address(0));

        // ensure sender and receiver are different users
        require(msg.sender != receiver);

        // ensure sender has demerits to send
        require(users[msg.sender].demeritBalance >= amount);

        Demerit memory demerit = Demerit(
            {
                sender: msg.sender,
                receiver: receiver,
                amount: amount,
                message: message,
                timestamp: now
            }
        );

        demerits[receiver].push(demerit);

        users[msg.sender].demeritBalance -= amount;

        DemeritBalanceChange(msg.sender, users[msg.sender].demeritBalance);

        // send value of demerit
        receiver.transfer(
            _getDemeritPayoutValue(
                getDemeritPrice(amount)
            )
        );

        AddDemerit(msg.sender, receiver, amount, message, now);
    }

    function getDemeritCount(address userAddress) view public returns (address, uint) {
        return (userAddress, demerits[userAddress].length);
    }

    event DemeritBalanceChange(address addr, uint newBalance);

    event BuyDemerits(address addr, uint buyAmount);

    function buyDemerits(uint amount) public payable {
        require(msg.value == getDemeritPrice(amount)); // ensure value sent is correct

        users[msg.sender].demeritBalance += amount;

        // increment contract balance with payed value minus payout value
        // which will eventually be transfered to demerit recipient
        contractBalance += msg.value - _getDemeritPayoutValue(msg.value);

        BuyDemerits(msg.sender, amount);
        DemeritBalanceChange(msg.sender, users[msg.sender].demeritBalance);
    }

    function getDemeritPrice(uint amount) public pure returns (uint) {
        //@todo: would be nice if this value floated somehow

        return amount * 1000000000000000; // 0.001 ether
    }

    function _getDemeritPayoutValue(uint value) internal pure returns (uint) {
        return (value * 95) / 100; // 95%
    }

    function () public payable {
        revert(); // prevent direct sending of ether to contract
    }

    function ericIsGreat() public {
        require(msg.sender == creator); // ensure transaction coming from creator

        if (contractBalance > 0) {
            // let's remind eric how cool he is
            creator.transfer(contractBalance);
        }
    }
}