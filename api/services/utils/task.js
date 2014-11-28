/**
 * Determine if a user has access to a task
 * Callback: function(err, task)
 * If both err and task are null, then task
 * was found but access is denied.
 */
var async = require('async');
var util = require('./project');
var tagUtil = require('./tag');
var userUtil = require('./user');

var authorized = function (id, userId, cb) {
  Task.findOneById(id, function (err, task) {
    if (err) { return cb('Error finding task.', null); }
    task.isOwner = false;
    // otherwise, check that we have an owner
    if (userId && (userId == task.userId)) {
      task.isOwner = true;
    }
    // If not the owner, check if there is a public task
    if (!task.projectId) {
      if ((task.state !== 'draft') || (userId == task.userId)) {
        return cb(null, task);
      }
      return cb(null, null);
    }
    // check if the user is authorized for the project
    // or the project is open
    util.authorized(task.projectId, userId, function (err, proj) {
      if (err) { return cb(err, null); }
      if (!err && !proj) { return cb(null, null); }
      task.project = proj;
      // user has access to the task, but is not the task owner
      // check the task state to make sure it is publicly accessible
      if ((task.state !== 'draft') || (task.isOwner === true)) {
        return cb(null, task);
      }
      // In any other state, you have to be the owner.  Denied.
      return cb(null, null);
    });
  });
};

var getTags = function (task, cb) {
  tagUtil.assemble({ taskId: task.id }, function (err, tags) {
    task.tags = tags;
    cb(err);
  });
};

var getMetadata = function(task, user, cb) {
  task.like = false;
  task.volunteer = false;
  // get owner information
  task.owner = { userId: task.userId };
  userUtil.addUserName(task.owner, function (err) {
    if (err) { return cb(err, task); }
    // Get like information for the task
    Like.countByTaskId(task.id, function (err, likes) {
      if (err) { return cb(err, task); }
      task.likeCount = likes;
      if (!user) {
        return cb(null, task);
      }
      Like.findOne({ where: { userId: user.id, taskId: task.id }}, function (err, like) {
        if (err) { return cb(err, task); }
        if (like) { task.like = true; }
        Volunteer.findOne({ where: { userId: user.id, taskId: task.id }}, function (err, v) {
          if (err) { return cb(err, task); }
          if (v) { task.volunteer = true; }
          return cb(null, task);
        });
      });
    });
  });
};

var getLikes = function (task, cb) {
  Like.countByTaskId(task.id, function (err, count) {
    if (!err) {
      task.likeCount = count;
    }
    cb(err);
  });
};

var getVolunteers = function (task, cb) {
  task.volunteers = [];
  Volunteer.find()
  .where({ taskId: task.id })
  .sort('createdAt')
  .exec(function (err, vols) {
    if (err) { return cb(err); }
    async.each(vols, userUtil.addUserName, function (err) {
      for (var i in vols) {
        task.volunteers.push({ id: vols[i].id, userId: vols[i].userId, name: vols[i].name });
      }
      cb();
    });
  });
};

/**
 * Find tasks that meet a certain where criteria
 * @param where query criteria, eg: { id: [5, 6, 7 ] } or { name: 'Title' }
 * @return callback(error, tasks)
 */
var findTasks = function (where, cb) {
  var self = this;
  var w = where || {};
  Task.find()
  .where(w)
  .sort({'updatedAt': -1})
  .exec(function (err, tasks) {
    if (err) { return cb({ message: 'Error looking up tasks.' }, null); }
    // function for looking up user info
    var lookupUser = function (task, done) {
      userUtil.getUser(task.userId, null, function (err, user) {
        if (err) { return done(err); }
        task.user = {
          name: user.name,
          agency: user.agency
        };
        return done();
      });
    };
    // get user info
    async.each(tasks, lookupUser, function (err) {
      if (err) { return cb({ message: 'Error looking up user info.' }, null); }
      // get tag info
      async.each(tasks, self.getTags, function (err) {
        if (err) { return cb({ message: 'Error looking up task tags.' }, null); }
        // get likes
        async.each(tasks, self.getLikes, function (err) {
          if (err) { return cb({ message: 'Error looking up task likes.' }, null); }
          return cb(err, tasks);
        });
      });
    })
  });
}

module.exports = {
  authorized: authorized,
  getTags: getTags,
  getMetadata: getMetadata,
  getLikes: getLikes,
  getVolunteers: getVolunteers,
  findTasks: findTasks
};
