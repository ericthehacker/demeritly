var Demeritly = artifacts.require('Demeritly');

contract('Demeritly', function(accounts){
    it("Should add users", function() {
        return Demeritly.deployed().then(function(instance) {

            return instance.addUser(
                accounts[0],
                'eric',
                'eric@ericisawesom.me',
                {
                    from: accounts[0]
                }
            ).then(function() {
                return instance.addUser(
                    accounts[1],
                    'wiese',
                    'wiese@ericisawesom.me',
                    {
                        from: accounts[1]
                    }
                );
            }).then(function() {
                return instance.users(accounts[0]);
            }).then(function(user) {
                assert.equal(user[0], accounts[0]);
                assert.equal(user[1], 'eric');
                assert.equal(user[2], 'eric@ericisawesom.me');
            }).then(function() {
                return instance.users(accounts[1]);
            }).then(function(user) {
                assert.equal(user[0], accounts[1]);
                assert.equal(user[1], 'wiese');
                assert.equal(user[2], 'wiese@ericisawesom.me');

                return instance.getUserAddressLength();
            }).then(function(length) {
                assert.equal(length, 2);

                return instance.get
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
                assert.equal(demerit[1], accounts[1]);
                assert.equal(demerit[2], 5);
                assert.equal(demerit[3], 'eric is great');

                return instance.getDemeritCount(accounts[1]);
            }).then(function(count) {
                assert.equal(count[0], accounts[1]);
                assert.equal(count[1], 1);
            });

        });
    });

});
