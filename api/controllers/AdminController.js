/**
 * AdminController
 *
 * @module      :: Controller
 * @description	:: Administrative functions only available to admin users
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */
var async = require('async');

module.exports = {

  /**
   * List users that match a certain filter, or all users if no filter
   * @param page the current page number
   * @param limit the maximum number of results per page to return
   * @param q the filter to apply to the search (filters by name)
   */
  users: function (req, res) {
    var page = parseInt(req.param('page', 1));
    var limit = req.param('limit', 25);
    var query = req.param('q');
    var where = {};

    if (query) {
      // search by both name and username
      where = {
        or: [
          { like: { name: '%' + query + '%' }},
          { like: { username: '%' + query + '%' }}
        ]
      };
    }

    var addUserMetrics = function(user, callback) {
      // check for lockouts
      user.locked = false;
      if (user.passwordAttempts >= sails.config.auth.auth.local.passwordAttempts) {
        user.locked = true;
      }
      async.parallel([
        // add project counts
        function(done) {
          // add created projects
          user.projectsCreatedOpen = 0;
          user.projectsCreatedClosed = 0;
          ProjectOwner.find().where({id:user.id}).exec(function(err, owners) {
            if (err) { done('Failed to retrieve ProjectOwners ' +  err);}
            if (owners.length !== 0) {
              var projIds = [];
              for (var j in owners) {
                projIds.push(owners[j].projectId);
              }
              Project.find().where({id: projIds}).exec(function(err, projects) {
                if (err) { done('Failed to retrieve projects ' +  err);}
                async.each(projects, function(project, cb) {
                  if (project.state === "public") {
                    user.projectsCreatedOpen++;
                    cb();
                  }
                  else if (project.state === "closed") {
                    user.projectsCreatedClosed++;
                    cb();
                  }
                }, function(err) {
                  done(null);
                });
              });
            } else {
              done(null);
            }
          });
        },
        // add task counts
        function(done) {
          user.tasksCreatedOpen = 0;
          user.tasksCreatedClosed = 0;
          Task.find().where({userId:user.id}).exec(function(err, tasks) {
            if (err) { done('Failed to retrieve tasks' + err);}
            if (tasks.count !== 0) {
              async.each(tasks, function(task, cb) {
                if (task.state === "public") {
                  user.tasksCreatedOpen++;
                  cb();
                } else if (task.state === "closed") {
                  user.tasksCreatedClosed++;
                  cb();
                }
              }, function(err) {
                done(null);
              });
            } else {
              done(null);
            }
          });
        },
        // add volunteer counts
        function(done) {
          user.volCountOpen = 0;
          user.volCountClosed = 0;
          Volunteer.find().where({userId:user.id}).exec(function(err, volunteers) {
            if (err) { done('Failed to retrieve volunteers ' +  err);}
            if (volunteers.length !== 0) {
              var taskIds = [];
              for (var i in volunteers) {
                taskIds.push(volunteers[i].taskId);
              }
              Task.find().where({id: taskIds}).exec(function(err, tasks) {
                if (err) { done('Failed to retrieve tasks for volunteers ' +  err);}
                async.each(tasks, function(task, cb) {
                  if (task.state === "public") {
                    user.volCountOpen++;
                    cb();
                  }
                  else if (task.state === "closed") {
                    user.volCountClosed++;
                    cb();
                  }
                }, function(err) {
                  done(null);
                });
              });
            } else {
              done(null);
            }
          });
        }], function(err) { 
          callback(null);
        });
    };

    // find users that meet this criteria
    User.find()
    .where(where)
    .sort('id')
    .paginate({ page: page, limit: limit})
    .exec(function (err, users) {
      if (err) { return res.send(400, { message: 'Error looking up users', err: err}); }
      // count the total number of users
      User.count(function (err, count) {
        if (err) { return res.send(400, { message: 'Error counting users', err: err}); }
        async.each(users, addUserMetrics, function(err) {
          if (err) { res.send(400, { message: 'Error retrieving metrics for users.', err: err}); }
          // return a paginated object
          sails.log.debug(users);
          return res.send({
            page: page,
            limit: Math.min(users.length, limit),
            count: count,
            users: users,
            q: query
          });
        });
      });
    });
  },

  /**
   * Retrieve metrics not tied to a particular user 
   * eg: /api/admin/metrics
   */
  metrics: function (req, res) {
    var metrics = {
      users: {
        count: 0,
        withTasks: 0
      },
      tasks: {
        count: 0,
        withVolunteers: 0
      },
      projects: {
        count: 0
      }
    };

    User.count().exec(function(err, userCount) {
      if (err) { return res.send(400, { message: 'An error occurred looking up user metrics.', error: err }); }
      metrics.users.count = userCount;
      Task.find().sort('userId').exec(function(err, tasks) {
        if (err) { return res.send(400, { message: 'An error occurred looking up task metrics.', error: err }); }
        metrics.tasks.count = tasks.length;
        var lastId = -1;
        for(var i = 0; i < metrics.tasks.count; i++) {
          if (tasks[i].userId !== lastId) {
            metrics.users.withTasks++;
            lastId = tasks[i].userId;
          }
        }
        Volunteer.find().sort('taskId').exec(function(err, vols) {
          if (err) { return res.send(400, { message: 'An error occurred looking up task metrics.', error: err }); }
          lastId = -1;
          for (var j = 0; j < vols.length; j++) {
            if (vols[j].taskId !== lastId) {
              metrics.tasks.withVolunteers++;
              lastId = vols[j].taskId;
            }
          }
          Project.count().exec(function(err, projectCount) {
            if (err) { return res.send(400, { message: 'An error occurred looking up project metrics.', error: err }); }
            metrics.projects.count = projectCount;
            sails.log.debug(metrics);
            return res.send(metrics);
          });
        });
      });
    });
  },

  /**
   * Add or remove admin priviledges from a user account
   * @param id the user id to make an admin or remove
   * @param action true to make admin, false to revoke
   * eg: /api/admin/admin/:id?action=true
   */
  admin: function (req, res) {
    if (!req.route.params.id) {
      return res.send(400, { message: 'Must specify a user id for this action.' });
    }
    User.findOneById(req.route.params.id, function (err, user) {
      if (err) { return res.send(400, { message: 'An error occurred looking up this user.', error: err }); }
      user.isAdmin = (req.param('action') === 'true');
      user.save(function (err) {
        if (err) { return res.send(400, { message: 'An error occurred changing admin status for this user.', error: err }); }
        return res.send(user);
      });
    });
  },

  /**
   * Unlock a user's account by resetting their password attempts
   * @param id the user id to clear password attempts
   */
  unlock: function (req, res) {
    if (!req.route.params.id) {
      return res.send(400, { message: 'Must specify a user id for this action.' });
    }
    User.findOneById(req.route.params.id, function (err, user) {
      if (err) { return res.send(400, { message: 'An error occurred looking up this user.', error: err }); }
      user.passwordAttempts = 0;
      user.save(function (err) {
        if (err) { return res.send(400, { message: 'An error occurred resetting password attempts.', error: err }); }
        return res.send(user);
      });
    });
  },

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to AdminController)
   */
  _config: {}

};
