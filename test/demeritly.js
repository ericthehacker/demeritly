var Demeritly = artifacts.require('Demeritly');

contract('Demeritly', function(accounts){
    it("Should add user", function() {
        return Demeritly.deployed().then(function(instance) {

            return instance.addUser(
                accounts[0],
                'eric',
                {
                    from: accounts[0]
                }
            ).then(function() {
                return instance.addUser(
                    accounts[1],
                    'wiese',
                    {
                        from: accounts[1]
                    }
                );
            }).then(function() {
                return instance.users(accounts[0]);
            }).then(function(user) {
                assert.equal(user[0], accounts[0]);
                assert.equal(user[1], 'eric');
            }).then(function() {
                return instance.users(accounts[1]);
            }).then(function(user) {
                assert.equal(user[0], accounts[1]);
                assert.equal(user[1], 'wiese');
            });

        });
    });

    it("Should add demerit", function() {
        return Demeritly.deployed().then(function(instance) {

            return instance.addDemerit(
                accounts[1],
                5,
                'eric is great',
                {
                    from: accounts[0]
                }
            ).then(function() {
                return instance.demerits(accounts[1], 0);
            }).then(function(demerit) {
                assert.equal(demerit[0], accounts[0]);
                assert.equal(demerit[1], 5);
                assert.equal(demerit[2], 'eric is great');
            });

        });
    });

});
