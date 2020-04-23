const _ = require('lodash');

const tasksCompletedAwards = {
  1: 'newcomer',
  3: 'maker',
  5: 'game changer',
  10: 'disruptor',
  15: 'partner',
};

module.exports = {
  /**
   *
   * Determines if the completion of a task makes a
   * user eligible for a badge, and if so, awards
   * that badge to the user.
   *
   * @param { Object } task
   * @param { Object } user
   * @param { object } opts - optional
   */
  awardForTaskCompletion: (task, user, opts) => {
    if (_.has(tasksCompletedAwards, user.completedTasks)) {
      return {
        type: tasksCompletedAwards[user.completedTasks],
        user: user.id,
        task: task.id,
        silent: (opts && !_.isUndefined(opts.silent)) ? opts.silent : false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } else {
      return null;
    }

    
  },
  /**
   *
   * Determines if the community manager role makes the
   * user eligible for a badge, and if so, awards
   * that badge to the user.
   *
   * @param { Object } communityUser
   * @param { Object } user
   * @param { object } opts - optional
   */
  awardCommunityManagerBadge: (user,communityUser, opts) => {  
    var badge ={     
      user: user,      
      silent: (opts && !_.isUndefined(opts.silent)) ? opts.silent : false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    if (communityUser.isManager== true ) {
      badge.type = 'community manager';   
    }
    return badge.type ? badge : null;
  },
  /**
   *
   * Determines if the publishing of a task makes the
   * task creator eligible for a badge, and if so, awards
   * that badge to the user.
   *
   * @param { Object } task
   * @param { Number } userId
   * @param { Object } opts - optional
   */
  awardForTaskPublish: (task, userId, opts) => {
    var badge = {
      user: userId,
      task: task.id,
      silent: ( opts && ! _.isUndefined( opts.silent ) ) ? opts.silent : false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    var taskType = _.find(task.tags, { type: 'task-time-required' });
    if (taskType && taskType.name) {
      if (taskType.name === 'One time') {
        badge.type = 'instigator';
      }
      else if (taskType.name === 'Ongoing') {
        badge.type = 'mentor';
      }
    }

    return badge.type ? badge : null;
  },
  /**
   *
   * Determines if the number of volunteers on a task makes
   * the task creator eligible for a badge, and if so, awards
   * that badge to the task creator.
   *
   * @param { Object } task
   * @param { Object } opts - optional
   */
  awardVolunteerCountBadge: (task, opts) => {
    if (task.volunteers.length === 4) {
      return {
        type: 'team builder',
        user: task.userId,
        task: task.id,
        silent: (opts && !_.isUndefined(opts.silent)) ? opts.silent : false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } else {
      return null;
    }
  },
};
