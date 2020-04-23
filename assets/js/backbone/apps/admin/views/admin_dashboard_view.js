var _ = require('underscore');
var Backbone = require('backbone');
var $ = require('jquery');

var ModalComponent = require('../../../components/modal');
var LoginConfig = require('../../../config/login.json');
var marked = require('marked');

var AdminDashboardTemplate = require('../templates/admin_dashboard_template.html');
var AdminSummaryTemplate = require('../templates/admin_summary_template.html');
var AdminDashboardTasks = require('../templates/admin_dashboard_task_metrics.html');
var AdminDashboardActivities = require('../templates/admin_dashboard_activities.html');
var AdminAnnouncementView = require('./admin_announcement_view');
var AdminTopContributorsView = require('./admin_top_contributors_view');
var AdminSystemSettngsTemplate = require('../templates/admin_system_settings_template.html');
var AdminSystemSettngFormTemplate = require('../templates/admin_system_setting_form_template.html');

var AdminDashboardView = Backbone.View.extend({

  events: {
    'change .group':              'renderTasks', 
    'change input[name=type]':    'renderTasks',
    'click .edit-system-setting': 'editSystemSetting',
  },

  initialize: function (options) {
    this.options = options; 
    this.data = {
      page: 1,
    }; 
  },

  render: function (replace) {
    var self = this;
    Backbone.history.navigate('/admin/sitewide', { replace: replace });
    this.$el.show();
    if (this.rendered === true) {
      return this;
    }
    var data = {
      user: window.cache.currentUser,
      login: LoginConfig,
    };
    var template = _.template(AdminDashboardTemplate)(data);
    this.$el.html(template);
    this.rendered = true;
    this.fetchData(self, this.data);
    return this;
  },

  renderMetrics: function (self, data) {
    var template = _.template(AdminSummaryTemplate)(data);
    self.$('.metric-block').html(template);
    this.$el.localize();
    self.$('.metric-block').show();
  },

  renderTopContributors: function () {
    if (this.adminTopContributorsView) {
      this.adminTopContributorsView.cleanup();
    }
    this.adminTopContributorsView = new AdminTopContributorsView({
      el: '.admin-top-contributors',
      target: 'sitewide',
    });
    this.adminTopContributorsView.render();
  },

  renderTasks: function () {
    var self = this,
        data = this.data,
        group = this.$('.group').val() || 'fy',
        filter = this.$('input[name=type]:checked').val() || '',
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
    function label (key) {
      if (key === 'undefined') return 'No date';   
      return group === 'week' ? 'W' + (+key.slice(4)) + '\n' + key.slice(0,4):
        group === 'month' ? months[key.slice(4) - 1]  + '\n' + key.slice(0,4) :
          group === 'quarter' ? 'Q' + (+key.slice(4)) + '\n' + key.slice(0,4) :
            group === 'fyquarter' ? 'Q' + (+key.slice(4)) + '\nFY' + key.slice(0,4) :
              group === 'fy' ? 'FY' + key : key;
             
    }
    $.ajax({
      url: '/api/admin/taskmetrics?group=' + group + '&filter=' + filter,
      dataType: 'json',
      success: function (data) {        
        data.label = label;     
        if(group=='fy'){
          var today = new Date();
          var currentYear = (today.getFullYear() + (today.getMonth() >= 9 ? 1 : 0)).toString();
          var previousYear= currentYear-1;       
          previousYear= previousYear.toString();    
          var year= [currentYear,previousYear];
          data.range = year;
        }      
        if(group=='month'){            
          self.generateMonthsDisplay(data);
        }
        if(group=='quarter'){
          self.generateQuartersDisplay(data);       
        }           
        var template = _.template(AdminDashboardTasks)(data);
        $('#search-results-loading').hide();
        data.tasks.active = self.data.tasks;
        self.$('.task-metrics').html(template);
        self.$el.localize();
        self.$('.task-metrics').show();
        self.$('.group').val(group);  
        self.$('input[name=type][value="' + filter +'"]').prop('checked', true);
      },
    });
  },
  quarter: function () {
    var today = new Date();
    var year = today.getFullYear();
    var month = (today.getMonth()+ 1).toString(); 
    var quarter;
    if      (month <= 3) { quarter = '1'; }
    else if (month <= 6) { quarter = '2'; }
    else if (month <= 9) { quarter = '3'; }
    else                 { quarter = '4'; }
    return year+''+quarter;
  }.bind(this),

  generateMonthsDisplay: function (data){
    var today = new Date();
    var currentTYear = today.getFullYear();  
    currentTYear = currentTYear.toString();
    var previousMYear = parseInt(currentTYear)-1;
    previousMYear=previousMYear.toString();
    var Myear= [previousMYear];  
    var previousYearRange= [];
    previousYearRange  = _.filter(data.range, function (di) {
      return _.contains(Myear, di.slice(0,4));
    });
    var months=[previousMYear+'01',+previousMYear+'02',previousMYear+'03',
      +previousMYear+'04',+previousMYear+'05',+previousMYear+'06',+previousMYear+'07',
      +previousMYear+'08',+previousMYear+'09',+previousMYear+'10',+previousMYear+'11',
      +previousMYear+'12'];
  
    var updateArray= _.difference(months,previousYearRange); 
    var previousYearData=_.chain(updateArray).sort().value(); 
    var previousYearDataUnion= _.union(previousYearData,previousYearRange).sort();
 
    var currentMYear= [currentTYear]; 
    var currentYearRange  = _.filter(data.range, function (di) {
      return _.contains(currentMYear, di.slice(0,4));
    });   
    // eslint-disable-next-line no-redeclare
    var year = today.getFullYear();
    var month = (today.getMonth()+ 1).toString();        
    var currentYearMonth;      
    if(month.length<2){
      currentYearMonth = year +'0'+ month;
    }
    else{
      currentYearMonth= year +''+ month;
    }      
    var monthsCurrent=[currentTYear+'01',+currentTYear+'02',currentTYear+'03',
      +currentTYear+'04',+currentTYear+'05',+currentTYear+'06',+currentTYear+'07',
      +currentTYear+'08',+currentTYear+'09',+currentTYear+'10',+currentTYear+'11',
      +currentTYear+'12'];

    monthsCurrent= _.filter(monthsCurrent,function (e){
      return  e <= currentYearMonth;
    });
    var updateCurrentArray= _.difference(monthsCurrent,currentYearRange); 
    var currentYearData=_.chain(updateCurrentArray).sort().value(); 
    var currentYearDataUnion= _.union(currentYearData,currentYearRange).sort();  
    data.range=_.union(currentYearDataUnion,previousYearDataUnion).sort(function (a, b) { return b-a; });
  },

  generateQuartersDisplay: function (data){
    var today = new Date();
    var currentQYear = today.getFullYear();  
    currentQYear = currentQYear.toString();
    var previousQYear = parseInt(currentQYear)-1;
    previousQYear= previousQYear.toString();
   
    var Myear= [previousQYear];  
    var previousYearRange= [];
    previousYearRange  = _.filter(data.range, function (di) {
      return _.contains(Myear, di.slice(0,4));
    });
    var months=[previousQYear+'1',previousQYear+'2',previousQYear+'3',
      previousQYear+'4'];
  
    var updateArray= _.difference(months,previousYearRange); 
    var previousYearData=_.chain(updateArray).sort().value(); 
    var previousYearDataUnion= _.union(previousYearData,previousYearRange).sort();
 
    var currentMYear= [currentQYear];
    var currentYearRange=[];
    currentYearRange  = _.filter(data.range, function (di) {
      return _.contains(currentMYear, di.slice(0,4));
    });
    
    var monthsCurrent=[currentMYear+'1',currentMYear+'2',currentMYear+'3',
      currentMYear+'4'];
    var currentQuarter=this.quarter();
    monthsCurrent= _.filter(monthsCurrent,function (m){
      return  m <= currentQuarter;
    });
    var updateCurrentArray= _.difference(monthsCurrent,currentYearRange); 
    var currentYearData=_.chain(updateCurrentArray).sort().value(); 
    var currentYearDataUnion= _.union(currentYearData,currentYearRange).sort();  
    data.range=_.union(currentYearDataUnion,previousYearDataUnion).sort(function (a, b) { return b-a; });
  },



  renderActivities: function (self, data) {
    var template = _.template(AdminDashboardActivities);
    self.$('.activity-block').html(template);
    _(data).forEach(function (activity) {

      if (!activity || !activity.user ||
        (activity.type === 'newVolunteer' && !activity.task) ||
        (activity.comment && typeof activity.comment.value === 'undefined')
      ) return;

      if (activity.comment) {
        var value = activity.comment.value;

        value = marked(value, { sanitize: false });
        //render comment in single line by stripping the markdown-generated paragraphs
        value = value.replace(/<\/?p>/gm, '');
        value = value.replace(/<br>/gm, '');
        value = value.trim();

        activity.comment.value = value;
      }
     
      activity.createdAtFormatted = $.timeago(activity.createdAt);
      var template = self.$('#' + activity.type).text(),
          content = _.template(template, { interpolate: /\{\{(.+?)\}\}/g })(activity);
      self.$('.activity-block .activity-feed ul').append(content);
    });

    this.$el.localize();
    self.$('.spinner').hide();
    self.$('.activity-block').show();
    self.renderTasks(self, this.data);
    self.renderAdminAnnouncement();
    self.renderTopContributors();
  },

  
  renderAdminAnnouncement: function () {
    if (this.adminAnnouncementView) {
      this.adminAnnouncementView.cleanup();
    }
    this.adminAnnouncementView = new AdminAnnouncementView({
      el: '#manage-announcement',
      agencyId: this.options.agencyId,
      adminMainView: this,
    });
    this.adminAnnouncementView.render();
  },

  renderSystemSettings: function (systemSettings) {
    var template = _.template(AdminSystemSettngsTemplate)({ systemSettings: systemSettings });
    $('.settings-block').html(template);
  },

  editSystemSetting: function (event) {
    event.preventDefault && event.preventDefault();
    this.renderEditSettingModal({
      key: $(event.currentTarget).data('key'),
      value: $(event.currentTarget).data('value'),
      display: $(event.currentTarget).data('display'),
    });
  },

  renderEditSettingModal: function (data) {
    this.modalComponent = new ModalComponent({         
      el: '#site-modal',
      id: 'edit-system-setting',
      modalTitle:  'Edit system setting',
      modalBody: _.template(AdminSystemSettngFormTemplate)(data),
      action: function (){    
      } ,     
      secondary: {
        text: 'Cancel',
        action: function () {          
          this.modalComponent.cleanup();    
        }.bind(this),
      },
      primary: {
        text: 'Save',
        action: function () {
          if (!validate({ currentTarget: $('#system-setting-value') })) {
            $.ajax({
              url: '/api/admin/setting',
              method: 'PUT',
              data: {
                key: data.key,
                value: $('#system-setting-value').val(),
              },
              success: function (result) {
                this.modalComponent.cleanup();
                $('a[data-key="' + data.key + '"]').data('value', result.value);
                $('#' + data.key).children('td')[1].innerText = result.value;
                $('#' + data.key).children('td')[2].innerText = moment(result.updated_at).format('MM/DD/YYYY hh:mma');
              }.bind(this),
            });
          }
        }.bind(this),
      },
    }).render();
  },

  fetchData: function (self, data) {
    $.ajax({
      url: '/api/admin/metrics',
      dataType: 'json',
      success: function (data) {
        self.data = data;
        $.ajax({
          url: '/api/admin/interactions',
          dataType: 'json',
          success: function (interactions) {
            data.interactions = interactions;
            interactions.count = _(interactions).reduce(function (sum, value, key) {
              return sum + value;
            }, 0);
            self.renderMetrics(self, data);
          },
        });
      },
    });
    $.ajax({
      url: '/api/admin/activities',
      dataType: 'json',
      success: function (data) {
        self.renderActivities(self, data);
      },
    });
    $.ajax({
      url: '/api/admin/settings',
      dataType: 'json',
      success: this.renderSystemSettings.bind(this),
    });
  },

  cleanup: function () {
    removeView(this);
  },
});

module.exports = AdminDashboardView;
