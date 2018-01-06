App = {
	contracts: {},
	account: null,
	demeritly: null,
	viewApp: null,

	init: function() {
		this.initWeb3();
		this.initContract();
	},

	initWeb3: function() {
		var that = this;

		// Is there an injected web3 instance?
		if (typeof web3 !== 'undefined') {
			App.web3Provider = web3.currentProvider;
		} else {
			// If no injected web3 instance is detected, fall back to Ganache
			App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
		}
		web3 = new Web3(App.web3Provider);

		web3.eth.getAccounts(function(error, accounts) {
			if (error) {
				console.log(error);
			}
		
			that.account = accounts[0];
		});
	},

	initContract: function() {
		var that = this;

		$.getJSON('Demeritly.json', function(data) {
			// Get the necessary contract artifact file and instantiate it with truffle-contract
			var DemeritlyArtifact = data;
			App.contracts.Demeritly = TruffleContract(DemeritlyArtifact);
		
			// Set the provider for our contract
			App.contracts.Demeritly.setProvider(App.web3Provider);

			App.contracts.Demeritly.deployed().then(function(instance) {
				that.demeritly = instance;

				d = instance; //@todo: for debugging

				that.initUi();
				that.bindEvents();
			}).catch(function(err) {
				console.log(err.message);
			});
		});
	},

	callMethod(methodName, args, value) {
		var that = this;

		if(!args) {
			args = [];
		}

		return that.demeritly[methodName].estimateGas.apply(this, args).then(function(gas){
			gas = parseInt(Number(gas) * 1); //gas estimate seems to be a little low.

			// add options
			var options = {
				from: that.account,
				gas: gas
			};
			if(value) {
				options.value = value;
			}
			args.push(options);

			// actually execute
			console.log('Running method ' + methodName + ' with following args');
			console.log(args);

			return that.demeritly[methodName].apply(that, args);
		});
	},

	bindEvents: function() {
		var that = this;

		$('#add-user-button').click(function() {
			that.callMethod(
				'addUser',
				[
					$('.add-user-address').val(),
					$('.add-user-name').val(),
					$('.add-user-email').val()
				]
			);
		});

		that.demeritly.AddUser().watch(function(error, result) {
			that.addUser(
				result.args.userAddress,
				result.args.name,
				result.args.email
			)
		});

		that.demeritly.AddDemerit().watch(function(error, result) {
			that.addDemerit(
				result.args.sender,
				result.args.receiver,
				result.args.amount,
				result.args.message
			)
		});
	},

	initUi: function() {
		var that = this;

		that.viewApp = new Vue({
			el: '#viewApp',
			data: {
				users: []
			}
		});

		this.initUsersUi();
		this.initDemeritsUi();
	},

	initUsersUi: function() {
		var that = this;

		var userLength = 0;
		that.callMethod('getUserAddressLength').then(function(length) {
			userLength = length;

			for(var i=0; i<length; i++) {
				that.callMethod(
					'userAddresses',
					[i]
				).then(function(address) {
					return that.callMethod(
						'users',
						[address]
					)
				}).then(function(user) {
					that.addUser(
						user[0],
						user[1],
						user[2]
					)
				});
			}
			
		})
	},

	initDemeritsUi: function() {

	},

	addUser: function(address, name, email) {
		this.viewApp.users.push({
			address: address,
			name: name,
			email: email
		});
	},

	addDemerit: function(sender, receiver, amount, message) {
		console.log('@todo: handleAddDemerit');
	}
};

$(function() {
  $(document).ready(function() {
    App.init();
  });
});
