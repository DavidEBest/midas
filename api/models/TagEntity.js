/**
 * TagEntity
 *
 * @module      :: Model
 * @description :: Storage of each of the tags with type and name
 *                 to be reused and referenced by id
 *
 */
var conf = require('../../config/local');

module.exports = {

  migrate: conf.migrate,

  attributes: {
    // type of the tag (such as 'skill' for Skill)
    type: 'STRING',
    // name of the tag (display name)
    name: 'STRING'
  }

};
