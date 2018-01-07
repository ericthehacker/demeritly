pragma solidity ^0.4.17;

contract Demeritly {
    struct User {
        address addr;
        string name;
        string email;
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

    event AddUser(address userAddress, string name, string email);

    function addUser(address userAddress, string name, string email) public {
        require(users[userAddress].addr == address(0)); // ensure user not already added

        User memory user = User(
            {
                addr: userAddress,
                name: name,
                email: email
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

        AddDemerit(msg.sender, receiver, amount, message, now);
    }

    function getDemeritCount(address userAddress) view public returns (address, uint) {
        return (userAddress, demerits[userAddress].length);
    }
}