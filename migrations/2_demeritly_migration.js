var Demeritly = artifacts.require("Demeritly");

module.exports = function(deployer) {
  // deployment steps
  deployer.deploy(Demeritly);
};
