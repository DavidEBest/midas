/**
/**
 * Source definition for preparing delivery of notifications (preflight)
 *
 * @module    :: preflight.js
 * @description :: defines service methods for delivery preflights
 */
var _ = require('underscore');
var userUtils = require('../utils/user');
var tagUtils  = require('../utils/tag');

module.exports = {
  // don't modify delivery content
  execute: function (fields, settings, cb) {
    var content = {};
    // set all default global locals for email
    content.fields = _.extend({}, sails.services.utils.emailTemplate['generateEmailLocals'](settings.emailName));
    content.fields.metadata = sails.services.utils.emailTemplate['addGlobals'](fields.metadata || {});
    content.settings = {};
    // look up primary email address for this user
    userUtils.findPrimaryEmail(fields.recipientId, function (err, userEmail) {
      if (err) { sails.log.debug(err); cb(null, content); return false; }
      if (userEmail) {
        content.fields.to = userEmail.email;
      } else {
        if ( fields.recipientId == 0 ){
          userUtils.getUserSettings(content.fields.metadata.modelTrigger.volunteerId,function(err,settingsObj){
            if ( settingsObj ){
              content.fields.to = settingsObj.supervisorEmail.value || '';
              content.fields.metadata.recipient.name = settingsObj.supervisorName.value || '';
            }
          });
        } else {
          content.fields.to = null;
        }
      }
      // store userEmail object as metadata
      content.fields.metadata.userEmail = userEmail;
      Task.findOneById(fields.callerId).exec(function (err, task) {
        if (err) { sails.log.debug(err); cb(null, content); return false;}
        //TASK OWNERS NAME
        userUtils.getUser(task.userId,fields.recipientId,function(err,requestor){
          content.fields.metadata.requestorName = requestor.name;

          //GET TAGS
          tagUtils.assemble({taskId: fields.callerId},function(err,tags){
            content.fields.metadata.tags = [];
            _.each(tags,function(tag){
              content.fields.metadata.tags[tag.tag.type] = tag.tag.name;
            });

            // store the task in the metadata
            content.fields.metadata.task = task;
            content.fields.volunteerId = content.fields.metadata.modelTrigger.volunteerId || null;
            // for a volunteer this the volunteer id otherwise it will never not match
            content.fields.initiatorId = content.fields.metadata.modelTrigger.volunteerId || null;
            // Get user info for volunteerId on behalf of recipientId (protect privacy)
            sails.services.utils.user['getUser'](content.fields.volunteerId, fields.recipientId, function (err, volunteer) {
              if (err) { sails.log.debug(err); return cb(err, content); }
              // store the volunteer info
              content.fields.metadata.volunteer = volunteer;
              // set the email fields
              content.fields.from = sails.config['systemEmail'];
              content.fields.subject = _.template(content.fields.subject)(content.fields.metadata);
              // Set template local variables for task metadata
              content.fields.templateLocals = content.fields.templateLocals || {};
              content.fields.templateLocals.taskTitle = task.title;
              content.fields.templateLocals.taskDescription = task.description;
              content.fields.templateLocals.requestorName = content.fields.metadata.requestorName;
              content.fields.templateLocals.taskLength = content.fields.metadata.tags['task-length'];
              content.fields.templateLocals.taskTimeEstimate = content.fields.metadata.tags['task-time-estimate'];
              content.fields.templateLocals.taskLink = content.fields.metadata.globals.urlPrefix  + '/tasks/' + task.id;
              content.fields.templateLocals.profileLink = content.fields.metadata.globals.urlPrefix  + '/profile/' + volunteer.id;
              content.fields.templateLocals.profileTitle = (volunteer.title ? volunteer.title : "");
              content.fields.templateLocals.profileName = (volunteer.name ? volunteer.name : "Someone");

              // set info on volunteer's location and agency
              volunteer.location = volunteer.location || {};
              volunteer.location.tag = volunteer.location.tag || {};
              volunteer.location.tag.name = volunteer.location.tag.name || '';
              volunteer.agency = volunteer.agency || {};
              volunteer.agency.tag = volunteer.agency.tag || {};
              volunteer.agency.tag.name = volunteer.agency.tag.name || '';
              content.fields.templateLocals.profileLocation = volunteer.location.tag.name;
              content.fields.templateLocals.profileAgency = volunteer.agency.tag.name;
              cb(null, content);
            });
          });
        });
      });
    });
  }
};
