var _ = require('underscore');

module.exports = {
  annotateTimeRequired: function (data, userAgency) {
    return _(data).map(function (item) {
      if (item.value == 'One time') {
        item.description = 'A one time task with a defined timeline';
        item.alwaysRestrictAgency = false;
      }
      else if (item.value == 'Ongoing') {
        item.description = 'Requires a portion of participant’s time until a goal is reached';
        item.alwaysRestrictAgency = false;
      }
      else if (item.value == 'Full Time Detail') {
        item.description = 'Restricted to requester\'s agency';
        item.alwaysRestrictAgency = true;
      }
      return item;
    });
  },

  toggleTimeOptions: function (view) {
    var currentValue       = view.$('[name=task-time-required]:checked').val(),
        timeRequired       = view.$('#time-options-time-required'),
        timeRequiredAside  = view.$('#time-options-time-required aside'),
        completionDate     = view.$('#time-options-completion-date'),
        timeFrequency      = view.$('#time-options-time-frequency'),
        restrictAgency     = view.$('#task-restrict-agency'),
        timeRequiredTag    = _.findWhere(view.tagSources['task-time-required'], {id: parseInt(currentValue)});
    var isRestricted       = _.property( 'projectNetwork', view.model.get( 'restrict' ) );
    var isFullTimeDetail   = _.property( 'value' )( timeRequiredTag ) === 'Full Time Detail';

    timeRequired.hide();
    timeRequiredAside.hide();
    timeFrequency.hide();
    completionDate.hide();

    if (timeRequiredTag) {
      if (isFullTimeDetail || isRestricted) {
        restrictAgency.prop('disabled', timeRequiredTag.alwaysRestrictAgency);
        restrictAgency.prop('checked', isFullTimeDetail || isRestricted);
      } else {
        restrictAgency.prop('checked', isFullTimeDetail || isRestricted);
        restrictAgency.prop('disabled', false);
      }

      if (timeRequiredTag.value === 'One time') {
        timeRequired.show();
        completionDate.show();
        timeRequiredAside.hide();
        timeFrequency.hide();
      }
      else if (timeRequiredTag.value === 'Ongoing') {
        timeRequired.show();
        timeRequiredAside.show();
        timeFrequency.show();
        completionDate.hide();
      }
    }
  },

  getCompletedByDate: function () {
    var month = $('#estimated-completion-date-1').val();
    var day = $('#estimated-completion-date-2').val();
    var year = $('#estimated-completion-date-3').val();
    if(!month && !day && !year) {
      return '';
    } else {
      return (year + '-' + month + '-' + day);
    }
  },
};
