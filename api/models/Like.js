/**
 * Like
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 *
 */
var conf = require('../../config/local');

module.exports = {

  migrate: conf.migrate,

  attributes: {

    // project that is liked
    projectId: 'INTEGER',
    // task that is liked
    taskId: 'INTEGER',
    // person that is liked
    targetId: 'INTEGER',
    // id of the user
    userId: 'INTEGER'

  }

};
