var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var User = require('../../../../utils/user');
var WelcomeTemplate = require('../templates/welcome_template.html');

var WelcomeView = Backbone.View.extend({
  el: '#container',

  events: {
    'click #continue-choose-profile'            : 'chooseProfile',
    'click #cancel-federal-create-profile'      : 'backToChoices',
    'click #cancel-student-create-profile'      : 'backToChoices',
    'click #cancel-contractor-create-profile'   : 'backToChoices',
    'click #hiring-path-fed'                    : 'enableContinue',
    'click #hiring-path-student'                : 'enableContinue',
    'click #hiring-path-contractor'             : 'enableContinue',
  },

  initialize: function (options) {
    this.options = options;
    return this;
  },

  render: function () {
    this.$el.html(_.template(WelcomeTemplate)(this.options.user));
    this.$el.localize();
    $('#search-results-loading').hide();
    $('.usa-footer-return-to-top').hide();
    return this;
  },

  enableContinue: function () {
    $('#continue-choose-profile').removeAttr('disabled');
  },

  chooseProfile: function () {
    if (document.getElementById('hiring-path-fed').checked) {
      $('#create-your-profile').addClass('hidden');
      $('#profile-federal-employee').removeClass('hidden');
    } else if (document.getElementById('hiring-path-student').checked) {
      $('#create-your-profile').addClass('hidden');
      $('#profile-student').removeClass('hidden');
    } else if (document.getElementById('hiring-path-contractor').checked) {
      $('#create-your-profile').addClass('hidden');
      $('#profile-contractor').removeClass('hidden');
    }
  },

  backToChoices: function () {
    if ($('#profile-federal-employee').hasClass('hidden')) {
      $('#profile-student').addClass('hidden');
      $('#profile-contractor').addClass('hidden');
      $('#create-your-profile').removeClass('hidden');
    } else if ($('#profile-student').hasClass('hidden')) {
      $('#profile-federal-employee').addClass('hidden');
      $('#profile-contractor').addClass('hidden');
      $('#create-your-profile').removeClass('hidden');
    } else if ($('#profile-contractor').hasClass('hidden')) {
      $('#profile-federal-employee').addClass('hidden');
      $('#profile-student').addClass('hidden');
      $('#create-your-profile').removeClass('hidden');
    }
  },

  cleanup: function () {
    removeView(this);
  },
});

module.exports = WelcomeView;