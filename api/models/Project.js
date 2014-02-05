/**
 * Project
 *
 * @module      :: Model
 * @description :: Represents a Project that contains many tasks
 *
 */
var conf = require('../../config/local');

module.exports = {

  migrate: conf.migrate,

  attributes: {
    // Current state of the project
    // Valid vales are: draft, public, closed
    // draft   : Project is only visible to owners
    // public  : Project is active and publicly displayed
    // closed  : Project is closed/completed, but can still be publicly viewed
    state: {
      type: 'STRING',
      defaultsTo: 'public'
    },
    // Project title
    title           : 'STRING',
    // Project description
    description     : 'STRING',
    // Cover image, refers to a file identifier
    coverId         : 'INTEGER'
  }

};
