/**
 * UserSettingController
 *
 * @module    :: Controller
 * @description :: Interaction with user settings
 */
//var userUtil = require('../services/utils/user');

module.exports = {
  find: function (req, res) {
    UserSetting.findByUserId(req.user[0].id)
    .exec(function(err,settings){
      return res.send(settings);
    });
  },

  findOne: function(req, res) {
    module.exports.find(req, res);
  }
};
