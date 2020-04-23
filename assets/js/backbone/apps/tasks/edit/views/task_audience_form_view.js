var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var TaskAudienceFormTemplate = require('../templates/task_audience_form_template.html');
var NavView = require('../../../nav/views/nav_view');


var TaskAudienceFormView = Backbone.View.extend({
  events: {
    'click .usa-button' : 'submit',
    'click .opportunity-target-audience__button' : 'selectAudience',
  },

  initialize: function (options){
    this.options = options;
  },

  render: function () {    
    this.loadAudienceCommunityData(); 
    $('#search-results-loading').hide();
    return this;
  },

  loadAudienceCommunityData:function (){
    $.ajax({
      url: '/api/task/communities',
      dataType: 'json',
      success: function (data){        
        if (data.federal.length == 0 && data.student.length == 0) {
          Backbone.history.navigate('/tasks/new', { trigger : true, replace: true });
        } else {
          var template = _.template(TaskAudienceFormTemplate)({
            communities: data,
          });
          this.$el.html(template);
          setTimeout(function () {
            var params = new URLSearchParams(window.location.search);
            if(data.federal.length > 0 && (params.get('target') == 'feds' || data.student.length == 0)) {
              this.target = 'federal';
              $('#federal-employees').addClass('selected');        
              $('#continue').removeAttr('disabled');           
            } else if (data.student.length > 0 && (params.get('target') == 'students' || data.federal.length == 0)) {
              this.target = 'student';
              $('#students').addClass('selected');            
              $('#continue').removeAttr('disabled');          
            } 
          }.bind(this), 50);
        }
      }.bind(this),
    });
  },

  selectAudience: function (e) {   
    if($(e.currentTarget).val() == 'Students') {
      this.target = 'student';   
      $('#students').addClass('selected');
      $('#federal-employees').removeClass('selected');    
    } else {
      this.target = 'federal';   
      $('#students').removeClass('selected');  
      $('#federal-employees').addClass('selected');    
    } 
    $('#continue').removeAttr('disabled');    
  },

  submit: function (e) {
    if ( e.preventDefault ) { e.preventDefault(); }
    if ( e.stopPropagation ) { e.stopPropagation(); }
    switch ($(e.currentTarget).data('state')) {
      case 'cancel':
        window.history.back();
        this.navView = new NavView({
          el: '.navigation',
        }).render();    
        break;
      default:
       
        var baseURL = (this.target == 'student' ? '/internships/new' : 'tasks/new');
        Backbone.history.navigate(baseURL , { trigger:true });
        break;
    }
  },
 
  cleanup: function () {
    removeView(this);
  },
});
module.exports = TaskAudienceFormView;