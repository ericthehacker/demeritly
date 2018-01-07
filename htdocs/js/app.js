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

		$(document).on('click', '.tab-target', function(e) {
			e.preventDefault();
			var link = $(this);

			$('.tab').removeClass('visible');

			$(link.attr('href')).addClass('visible');
		});

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

		$('#demerit-submit').click(function() {
			that.callMethod(
				'addDemerit',
				[
					$('#demerit-receiver').val(),
					$('#demerit-amount').val(),
					$('#demerit-message').val()
				]
			);
		});

		that.demeritly.AddUser().watch(function(error, result) {
			if(!error) {
				that.addUser(
					result.args.userAddress,
					result.args.name,
					result.args.email
				);
			}
		});

		that.demeritly.AddDemerit().watch(function(error, result) {
			if(!error) {
				that.addDemerit(
					result.args.sender,
					result.args.receiver,
					result.args.amount,
					result.args.message,
					result.args.timestamp
				)
			}
		});
	},

	initUi: function() {
		var that = this;

		that.viewApp = new Vue({
			el: '#viewApp',
			components: {
				'demerits': {
					//el: '#demerits-template', //@todo: move template out of JS
					template: `
						<div class="demerits">
							<p class="demerit" v-for="demerit in demerits">
								<span class="field">
									<strong>Date:</strong> {{ demerit.formattedDate }}
								</span>
								<span class="field">
									<strong>From:</strong> 
									<a v-bind:href="'#' + demerit.sender.address" class="tab-target">
										{{ demerit.sender.name }}
									</a>
								</span>
								<span class="field">
									<strong>To:</strong>
									<a v-bind:href="'#' + demerit.receiver.address" class="tab-target">
										{{ demerit.receiver.name }}
									</a>
								</span>
								<span class="field">
									<strong>Amount:</strong> -{{ demerit.amount }}
								</span>
								<span class="field">
									<strong>Message:</strong> {{ demerit.message }}
								</span>
							</p>
						</div>`,
					props: [
						'demerits'
					]
				}
			},
			data: {
				userIndexByAddress: {},
				knownDemeritHashes: [],
				users: [],
				demerits: [],
				demeritsBySenderAddress: {},
				demeritsByReceiverAddress: {},
				userDetail: null
			},
			methods: {
				userSentDemerits: (address) => {
					if(that.viewApp.demeritsBySenderAddress[address] === undefined) {
						return [];
					}

					let demerits = [];
					that.viewApp.demeritsBySenderAddress[address].forEach(index =>
						demerits.push(that.viewApp.demerits[index])
					);
					
					return demerits;
				},
				userReceivedDemerits: (address) => {
					if(that.viewApp.demeritsByReceiverAddress[address] === undefined) {
						return [];
					}

					let demerits = [];
					that.viewApp.demeritsByReceiverAddress[address].forEach(index =>
						demerits.push(that.viewApp.demerits[index])
					);
					
					return demerits;
				}
			}
		});

		this.initUsersUi();
		this.initDemeritsUi();
	},

	initUsersUi: function() {
		var that = this;

		var usersAddresses = [];
		that.callMethod('getUserAddressLength').then(length => {
			for(var i=0; i<length; i++) {
				usersAddresses.push(that.callMethod(
					'userAddresses',
					[i]
				));
			}

			return Promise.all(usersAddresses);
		}).then(addresses => {
			var users = [];
			addresses.forEach(address =>
				users.push(
					that.callMethod('users', [address])
				)
			);

			return Promise.all(users);
		}).then(users => {
			users.forEach(user => 
				that.addUser(
					user[0],
					user[1],
					user[2]
				)
			);

			window.dispatchEvent(new Event('usersLoaded'));
		});
	},

	initDemeritsUi: function() {
		let that = this;

		window.addEventListener('usersLoaded', e => {
			let demeritCounts = [];
			for (let address in that.viewApp.userIndexByAddress) {
				if (!that.viewApp.userIndexByAddress.hasOwnProperty(address)) {
					continue;
				}

				demeritCounts.push(that.callMethod('getDemeritCount', [address]));
			}

			Promise.all(demeritCounts).then(function(addressCountPairs) {
				let demerits = [];
				addressCountPairs.forEach(addressCountPair => {
					let address = addressCountPair[0];
					let count = addressCountPair[1].toNumber();

					for (let i=0; i<count; i++) {
						demerits.push(that.callMethod(
							'demerits',
							[address, i]
						));
					}
				});
				
				return Promise.all(demerits);;
			}).then(function(demerits){
				demerits.forEach(demerit => 
					that.addDemerit(
						demerit[0],
						demerit[1],
						demerit[2],
						demerit[3],
						demerit[4]
					)
				);
			});
		});
	},

	_getAvatarUrl: function(email) {
		return 'https://www.gravatar.com/avatar/' + SparkMD5.hash(email.trim());
	},

	addUser: function(address, name, email) {
		var that = this;

		if(that.viewApp.userIndexByAddress[address] !== undefined) {
			return;
		}

		that.viewApp.users.push({
			address: address,
			name: name,
			email: email,
			avatar: that._getAvatarUrl(email)
		});

		that.viewApp.userIndexByAddress[address] = that.viewApp.users.length - 1;
		
		//@todo: disable sort until index mapping fixed
		// that.viewApp.users.sort(function(a,b) {
		// 	return a.name.localeCompare(b.name);
		// });
	},

	addDemerit: function(sender, receiver, amount, message, timestamp) {
		timestamp = timestamp.toNumber();

		let that = this;
		let locale = navigator.language;
		let date = new Date(timestamp * 1000);

		let hash = [
			sender,
			receiver,
			timestamp
		].join('-');

		if(
			that.viewApp.knownDemeritHashes.indexOf(hash) !== -1
			|| that.viewApp.userIndexByAddress[sender] === undefined
			|| that.viewApp.userIndexByAddress[receiver] === undefined
		) {
			// must be event firing too early -- bail
			return;
		}

		var senderUser = that.viewApp.users[that.viewApp.userIndexByAddress[sender]];
		var receiverUser = that.viewApp.users[that.viewApp.userIndexByAddress[receiver]];

		that.viewApp.demerits.push({
			sender: senderUser,
			receiver: receiverUser,
			amount: amount.toNumber(),
			message: message,
			timestamp: timestamp,
			formattedDate: date.toLocaleDateString(locale) + ' ' + date.toLocaleTimeString(locale)
		});

		let demeritIndex = that.viewApp.demerits.length - 1;

		that.viewApp.demerits.sort(function(a,b){
			return -1 * (a.timestamp - b.timestamp);
		});

		// populate convenience mappings
		that.viewApp.knownDemeritHashes.push(hash);
		if(that.viewApp.demeritsBySenderAddress[sender] === undefined) that.viewApp.demeritsBySenderAddress[sender] = [];
		that.viewApp.demeritsBySenderAddress[sender].push(demeritIndex);
		if(that.viewApp.demeritsByReceiverAddress[receiver] === undefined) that.viewApp.demeritsByReceiverAddress[receiver] = [];
		that.viewApp.demeritsByReceiverAddress[receiver].push(demeritIndex);
	}
};

$(function() {
  $(document).ready(function() {
    App.init();
  });
});
