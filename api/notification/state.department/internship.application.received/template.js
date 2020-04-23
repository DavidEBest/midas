module.exports = {
  subject: 'U.S. Department of State Student Internship Program (Unpaid) - Thank you for your application',
  to: '<%= user.username %>',
  data: function (model, done) {
    var data = {
      application: model.application,
      user: model.user,
      cycle: model.cycle,
    };
    done(null, data);
  },
};
