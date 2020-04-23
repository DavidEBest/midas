/**
 * This is the main application bootstrap
 * that gets the rest of the apps, routers, etc
 * running.
 */

// Set up Backbone to use jQuery
var $ = window.jQuery = require('jquery');
// TODO: ideally ^^^ wouldn't be global, blueimp-file-upload wants this
require('jquery-ui-dist/jquery-ui');

var _ = require('underscore');
var Backbone = require('backbone');

// Import global functions
require('./globals');

Backbone.$ = $;

// Set CSRF header
$.ajaxPrefilter(function (options, originalOptions, jqXHR) {
  var token;
  token = $('meta[name="csrf-token"]').attr('content');
  if (token) {
    return jqXHR.setRequestHeader('X-CSRF-Token', token);
  }
});

// Install jQuery plugins
// TODO: maybe this shouldn't be global vvv
require('blueimp-file-upload/js/vendor/jquery.ui.widget');
window.moment = require('moment-timezone');
window.numeral = require('numeral');

// Set markdown defaults
var marked = require('marked');
var rendererWithExternalLinkSupport = require('../utils/rendererWithExternalLinkSupport');

marked.setOptions({
  sanitize: true,
  renderer: rendererWithExternalLinkSupport.renderer,
});

// App
window.Application = window.Application || {};
window.cache = { userEvents: {}, currentUser: null, system: {} };

// Events
window.entities = { request: {} };
window.rendering = {};


// Global AJAX error listener. If we ever get an auth error, prompt to log
// in otherwise show the error.
$(function () {
  $(document).ajaxError(function (e, jqXHR, settings, errorText) {
    $('.spinner').hide();
    if (jqXHR.status === 401 || jqXHR.status === 403) {
      if(jqXHR.responseText == 'Access Forbidden') {
        Backbone.history.navigate('/unauthorized', { replace: true, trigger: true });
      } else if (window.cache || window.cache.userEvents || ('trigger' in window.cache.userEvents)) {
        window.cache.userEvents.trigger('user:request:login', {
          disableClose: false,
          message: (jqXHR.responseJSON && jqXHR.responseJSON.message) || '',
        });
      }
    } else {
      $('.alert-global')
        .html('<strong>' + errorText + '</strong>. ' +
          (jqXHR.responseJSON && jqXHR.responseJSON.message) || '')
        .show();
    }
  });
});

// Load the application
var appr = require('./app-run');
$.ajax({
  url: '/api/user',
  dataType: 'json',
  success: function (user) {
    appr.initialize(user);
  },
  error: function () {
    appr.initialize();
  },
});
