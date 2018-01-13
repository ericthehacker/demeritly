App = {
	EMPTY_ADDRESS: '0x0000000000000000000000000000000000000000',

	web3Provider: null,
	contracts: {},
	accounts: [],
	demeritly: null,
	viewApp: null,
	accountsUiApp: null,

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
			} else {
				that.accounts = accounts;
			}
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

	getAccount: function() {
		return window.location.hash.substr(1);
	},

	callMethod(methodName, args, value) {
		var that = this;

		if(!args) {
			args = [];
		}

		// make temp args copy for estimation purposes
		var estimationArgs = args.slice();
		let estimationOptions = {
			from: that.getAccount()
		};
		if(value) {
			estimationOptions.value = value;
		}
		estimationArgs.push(estimationOptions);

		return that.demeritly[methodName].estimateGas.apply(this, estimationArgs).then(function(gas){
			gas = parseInt(Number(gas) * 1); //gas estimate seems to be a little low.

			// add options
			var options = {
				from: that.getAccount(),
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

		$('#register-button').click(e => {
			that.callMethod(
				'addUser',
				[
					that.getAccount(),
					$('#register-name').val(),
					$('#register-email').val(),
				]
			).then(() => {
				window.location.reload();
			});
		});

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

		$(document).on('click', '#demerit-submit', function() {
			that.callMethod(
				'addDemerit',
				[
					$('#demerit-receiver').val(),
					$('#demerit-amount').val(),
					$('#demerit-message').val()
				]
			);
		});

		$(document).on('click', '#add-balance-button', e => {
			var amount = $('#add-balance-amount').val();

			that.callMethod(
				'getDemeritPrice',
				[amount]
			).then(price => {
				return that.callMethod(
					'buyDemerits',
					[amount],
					price.toNumber()
				);
			});
		});

		window.addEventListener('viewAppLoaded', e => {
			that.demeritly.DemeritBalanceChange().watch(function(error, result) {
				if(!error) {
					that.demeritBalanceChange(
						result.args.addr,
						result.args.newBalance
					);
				}
			});
		});

		window.addEventListener('viewAppLoaded', e => {
			that.demeritly.AddUser().watch(function(error, result) {
				if(!error) {
					that.addUser(
						result.args.userAddress,
						result.args.name,
						result.args.email
					);
				}
			});
		});

		window.addEventListener('viewAppLoaded', e => {
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
		});
	},

	initUi: function() {
		var that = this;

		this.initAccountsUi();

		if(that.getAccount().length == 0) {
			return; // no account selected yet
		}

		// user has selected account -- proceed.

		that.callMethod(
			'users',
			[
				that.getAccount()
			]
		).then(user => {
			if(user[0] == that.EMPTY_ADDRESS) {
				// user's address not in user list -- display register UI
				$('#register').addClass('visible');
			} else {
				// user's address is in user list -- display main UI
				that.initDemeritlyUiApp();
				that.initUsersUi();
				that.initDemeritsUi();
			}
		});
	},

	initAccountsUi: function() {
		let that = this;

		that.accountsUiApp = new Vue({
			el: '#account-switcher-app',
			data: {
				accounts: that.accounts,
				selectedAccount: that.getAccount()
			}
		});

		$('#account-switcher-button').click(e => {
			window.location.hash = $('#account-switcher').val();
			window.location.reload(); //hacky but it makes state management easier
		});
	},

	initDemeritlyUiApp: function() {
		var that = this;

		that.viewApp = new Vue({
			el: '#demeritly-app',
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
				accounts: that.accounts,
				demeritBalance: 0
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

		window.dispatchEvent(new Event('viewAppLoaded'));
	},

	_getUserObject: function(rawUserData) {
		return {
			address: rawUserData[0],
			name: rawUserData[1],
			email: rawUserData[2],
			demeritBalance: rawUserData[3].toNumber()
		}
	},

	initUsersUi: function() {
		var that = this;

		var usersAddresses = [];
		that.callMethod('getUserAddressLength').then(length => {
			length = length.toNumber();

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
			users.forEach(rawUserData => {
				let user = that._getUserObject(rawUserData);

				that.addUser(
					user.address,
					user.name,
					user.email,
					user.demeritBalance
				);

				if(user.address == that.getAccount()) {
					that.initCurrentUserUi(user);
				}
			});

			window.dispatchEvent(new Event('usersLoaded'));
		});
	},

	initCurrentUserUi: function(user) {
		this.viewApp.demeritBalance = user.demeritBalance;
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
	},

	demeritBalanceChange: function(address, newBalance) {
		var that = this;

		if(address != that.getAccount()) {
			// only interested in current account
			return;
		}

		that.viewApp.demeritBalance = newBalance.toNumber();
	}
};

$(document).ready(function() {
	App.init();
});
