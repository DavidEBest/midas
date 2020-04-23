module.exports = {
  subject: 'New internship opportunity submitted',
  to: '<%= admin.governmentUri ? admin.governmentUri : admin.username %>',
  data: function (model, done) {
    var data = {
      task: model.task,
      user: model.user,
      admin: model.admin,
      community: model.community,
      cycle: model.cycle,
    };
    done(null, data);
  },
};