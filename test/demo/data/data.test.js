var assert = require('chai').assert;
var _ = require('underscore');
var async = require('async');
var conf = require('./config');
var utils = require('./utils');
var request;

describe('demo:', function() {

  before(function(done) {
    request = utils.init();
    done();
  });

  it('users', function (done) {
    var process = function (user_attrs, done) {
      // create/login as user
      utils.login(request, user_attrs.username, user_attrs.password, function (err, user) {
        if (err) return done(err);
        utils.user_put(request, user.id, user_attrs, function (err, userObj) {
          console.log('user created:', userObj.name);
          user_attrs.obj = userObj;
          user_attrs.id = userObj.id;
          return done(err);
        });
      });
    };

    async.eachSeries(_.values(conf.users), process, function (err) {
      done(err);
    });
  });

  it('tags', function (done) {
    var process = function (tag, done) {
      utils.tag_find(request, tag.name, tag.type, function (err, t) {
        if (err) return done(err);
        // if tag exists, just update it with the tag id
        if (t) {
          tag.obj = t;
          tag.id = t.id;
          return done(err);
        }
        utils.tag_add(request, tag, function (err, t) {
          tag.obj = t;
          tag.id = t.id;
          return done(err);
        });
      });
    };

    async.eachSeries(_.values(conf.tags), process, function (err) {
      return done(err);
    });
  });

  it('user tags', function (done) {
    var entities = ['location', 'agency'];
    var process = function (user, done) {
      var processE = function (entity, done) {
        var request = utils.init();
        var createTag = function (tag, done) {
          utils.tag_create(request, tag, function (err, tagObj) {
            return done(err);
          });
          return;
        };
        if (user[entity]) {
          utils.login(request, user.username, user.password, function (err) {
            if (err) return done(err);
            var tagEntity = conf.tags[user[entity]];
            createTag({ tagId: tagEntity.id }, done);
          });
          return;
        }
        else {
          return done();
        }
      };

      async.eachSeries(entities, processE, function (err) {
        return done(err);
      });
    };
    async.eachSeries(_.values(conf.users), process, function (err) {
      return done(err);
    });
  });

  it('projects', function (done) {
    var process = function (proj, done) {
      var user = conf.users[proj.owner];

      // sub-functions to create comments
      var createComments = function (comments, parentId, done) {
        var request = utils.init();

        var processComment = function (comment, done) {
          var user = conf.users[comment['user']];
          utils.login(request , user.username, user.password, function (err) {
            if (err) return done(err);
            comment.projectId = proj.id;
            if (parentId) {
              comment.parentId = parentId;
            }
            utils.comment_create(request, comment, function (err, commentObj) {
              if (err) return done(err);
              comment.obj = commentObj;
              comment.id = commentObj.id;
              if (comment.children) {
                createComments(comment.children, comment.id, function (err) {
                  done(err);
                })
              } else {
                done();
              }
            });
          });
        };
        async.eachSeries(comments, processComment, function (err) {
          done(err);
        });
      };

      var startCover = function (proj, done) {
        var request = utils.init();
        if (!proj.cover) return done();
        utils.login(request, user.username, user.password, function (err) {
          if (err) return done(err);
          utils.proj_put(request, proj, function (err, projObj) {
            if (err) return done(err);
            proj.obj = projObj;
            done(err);
          });
        });
      };

      var startComments = function (proj, done) {
        if (!proj.comments) return done();
        createComments(proj.comments, null, done);
      };

      var startOwners = function (proj, done) {
        var request = utils.init();
        var createOwner = function (owner, done) {
          var pOwner = {
            projectId: proj.id,
            userId: conf.users[owner].id
          };
          utils.projowner_create(request, pOwner, function (err, ownerObj) {
            owner.obj = ownerObj;
            owner.id = ownerObj.id;
            done(err);
          });
        };
        if (!proj.owners) return done();
        utils.login(request, user.username, user.password, function (err) {
          if (err) return done(err);
          async.each(proj.owners, createOwner, done);
        });
      };

      var startEvents = function (proj, done) {
        var request = utils.init();
        var now = new Date();
        var createEvent = function (ev, done) {
          ev.projectId = proj.id;
          ev.start = new Date(now.valueOf());
          ev.start.setDate(now.getDate() + Math.ceil(Math.random()*30));
          ev.start.setMinutes(0);
          ev.start.setSeconds(0);
          ev.start.setMilliseconds(0);
          ev.end = new Date(ev.start.getTime());
          ev.end.setHours(ev.start.getHours() + 1);
          ev.start = ev.start.toISOString();
          ev.end = ev.end.toISOString();
          utils.event_create(request, ev, function (err, eventObj) {
            ev.obj = eventObj;
            ev.id = eventObj.id;
            done(err);
          });
        };
        utils.login(request, user.username, user.password, function (err) {
          if (err) return done(err);
          async.each(proj.events, createEvent, done);
        });
      };

      var startTasks = function (proj, done) {
        var request = utils.init();
        var createTask = function (task, done) {
          task.projectId = proj.id;
          utils.task_create(request, task, function (err, taskObj) {
            task.obj = taskObj;
            task.id = taskObj.id;
            done(err);
          });
        }
        utils.login(request, user.username, user.password, function (err) {
          if (err) return done(err);
          async.each(proj.tasks, createTask, done);
        });
      };

      var startTags = function (tag, done) {
        var request = utils.init();
        var createTag = function (tag, done) {
          var t = {
            tagId: conf.tags[tag].id,
            projectId: proj.id
          };
          utils.tag_create(request, t, function (err, tagObj) {
            done(err);
          });
        };
        utils.login(request, user.username, user.password, function (err) {
          if (err) return done(err);
          async.each(proj.tags, createTag, done);
        });
      };

      var start = function (fn, done) {
        fn(proj, done);
      };

      var order = [startCover, startOwners, startComments, startEvents, startTasks, startTags];

      // start processing each project
      utils.login(request, user.username, user.password, function (err) {
        if (err) return done(err);
        utils.proj_create(request, proj, function (err, projObj) {
          proj.obj = projObj;
          proj.id = projObj.id;
          // Process each of the sub functions
          async.eachSeries(order, start, function (err) {
            done(err);
          });
        });
      });
    };

    async.eachSeries(conf.projects, process, function (err) {
      done(err);
    });
  });

  after(function(done) {
    // Disable all of the users after populating the database
    var disableUser = function(u, done) {
      utils.login(request, u.username, u.password, function (err) {
        if (err) return done(err);
        utils.user_info(request, function (err, user) {
          if (err) return done(err);
          utils.user_disable(request, user, function (err, user) {
            done(err);
          });
        });
      });
    };

    async.eachSeries(_.values(conf.users), disableUser, function (err) {
      done(err);
    });
  });

});
