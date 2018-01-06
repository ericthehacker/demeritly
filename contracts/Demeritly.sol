pragma solidity ^0.4.17;

contract Demeritly {
    struct User {
        address addr;
        string name;
    }

    struct Demerit {
        address sender;
        uint8 amount;
        string message;
    }

    address[] public userAddresses;
    mapping(address => User) public users;
    mapping(address => Demerit[]) public demerits;

    event AddUser(address userAddress, string name);

    function addUser(address userAddress, string name) public {
        require(users[userAddress].addr == address(0)); // ensure user not already added

        User memory user = User(
            {
                addr: userAddress,
                name: name
            }
        );

        userAddresses.push(userAddress);
        users[userAddress] = user;

        AddUser(userAddress, name);
    }

    event AddDemerit(address sender, address receiver, uint8 amount, string message);

    function addDemerit(address receiver, uint8 amount, string message) public {
        // ensure both sender and reciever are users
        require(users[msg.sender].addr != address(0));
        require(users[receiver].addr != address(0));

        Demerit memory demerit = Demerit(
            {
                sender: msg.sender,
                amount: amount,
                message: message
            }
        );

        demerits[receiver].push(demerit);

        AddDemerit(msg.sender, receiver, amount, message);
    }
}