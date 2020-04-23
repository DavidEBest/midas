module.exports = {
  subject: 'Reset your password on <%- globals.systemName %>',
  to: '<%= user.governmentUri ? user.governmentUri : user.username %>',
  data: function (model, done) {
    var data = {
      user: model.user,
      link: '/profile/reset/' + model.token,
    };
    done(null, data);
  },
};
