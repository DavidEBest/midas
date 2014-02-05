/**
 * Event
 *
 * @module      :: Model
 * @description :: An event -- mirrors the iCalendar internet format
 *
 */
var conf = require('../../config/local');

module.exports = {

  migrate: conf.migrate,

  attributes: {
    // Mirrors iCal VEVENT:STATUS.
    // Valid valids are TENTATIVE, CONFIRMED, CANCELLED
    status: {
      type: 'STRING',
      defaultsTo: 'CONFIRMED'
    },
    // UUID for the event
    uuid: 'UUIDV4',
    // Title of the event
    title: 'STRING',
    // More information about the event
    description: 'STRING',
    // Event start time (UTC)
    start: 'DATETIME',
    // Event end time (UTC)
    end: 'DATETIME',
    // Location of the event
    location: 'STRING',
    // User ID of the creator
    userId: 'INTEGER',
    // ID of the project associated with this event
    projectId: 'INTEGER'
  }

};
