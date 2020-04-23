var _ = require('underscore');
var Backbone = require('backbone');
var $ = require('jquery');
var AdminCommunityTemplate = require('../templates/admin_community_template.html');
var AdminCommunityDashboardActivitiesTemplate = require('../templates/admin_community_dashboard_activities_template.html');
var AdminCommunityTasks = require('../templates/admin_community_task_metrics.html');
var AdminCommunityCyclicalTasksInteractions = require('../templates/admin_community_cycle_task_interactions.html');
var AdminCommunityView = Backbone.View.extend({

  events: {
    'change #communities'         : 'changeCommunity',
    'click #community-edit'       : linkBackbone,
    'click .usajobs-alert__close' : 'closeAlert',
    'change #sort-user-community' : 'sortUsers',
    'change .group'         : 'renderTasks', 
    'change input[name=type]':'renderTasks',
    'change #cycles'         : 'changeCycles',
  },

  initialize: function (options) {
    this.options = options;
    this.adminMainView = options.adminMainView;
    this.communityId = options.communityId || options.communities[0].communityId;
    this.params = new URLSearchParams(window.location.search);   
    this.cycleParam= this.params.get('cycle'),  
    this.community= {};  
    this.cycleId= '';
    this.cycles ={};
  },

  render: function (replace) {
    var self = this;
    this.$el.show();
    this.loadCommunityData(replace);
    $('#search-results-loading').hide();   
    return this;
  },

  closeAlert: function (event) {
    $(event.currentTarget).closest('.usajobs-alert').hide();
  },

  loadCommunityData: function (replace) {
    // get meta data for community
    $.ajax({
      url: '/api/admin/community/' + this.communityId,
      dataType: 'json',
      success: function (communityInfo) {      
        this.community = communityInfo;        
        if(this.community.cycles && this.community.cycles.length>0){ 
          this.getDefaultCycle();  
          communityInfo.cycles= this.cycles;
          var template = _.template(AdminCommunityTemplate)({
            community: communityInfo,
            communities: this.options.communities,
            updateSuccess: this.params.has('updateSuccess'),
            saveSuccess:this.params.has('saveSuccess'),
            cycleId: this.cycleParam ,  
          });
          this.$el.html(template);        
          this.rendertasksInteractionsCyclical();            
        }
        else {
          this.loadInteractionsData(function (interactions) {
            communityInfo.interactions = interactions;
            var template = _.template(AdminCommunityTemplate)({
              community: communityInfo,
              communities: this.options.communities,
              updateSuccess: this.params.has('updateSuccess'),
              saveSuccess:this.params.has('saveSuccess'),
            });
            this.$el.html(template);
            setTimeout(function () {
              this.fetchData(this);
              this.renderTasks();
            }.bind(this), 50);
            if(this.options.communities) {
              this.initializeCommunitySelect();
            }
          }.bind(this));
          Backbone.history.navigate('/admin/community/' + this.communityId, {replace:replace }); 
        }     
      }.bind(this),
    });
  },
  rendertasksInteractionsCyclical:function () {     
    var self= this;
    self.cycleId = self.$('#cycles').val(); 
    Backbone.history.navigate('/admin/community/' + $('#communities').val() + '?cycle=' + self.cycleId, { trigger: true  }); 
    $.ajax({
      url: '/api/admin/community/' + self.communityId +'/cyclical/'+ self.cycleId ,
      dataType: 'json',
      success: function (communityInfo) {    
        self.community = communityInfo;        
        self.loadCyclicalInteractionsData(function (interactions) {
          communityInfo.interactions = interactions;
          var template = _.template(AdminCommunityCyclicalTasksInteractions)({
            community: communityInfo,
            communities: self.options.communities, 
            cycleId:self.cycleId,  
          });   
          $('#search-results-loading').hide();  
          self.$('.cyclical-task-interactions-metrics').html(template);
          self.$el.localize();
          self.$('.cyclical-task-interactions-metrics').show();      
          setTimeout(function () {       
            self.fetchData(self);         
          }.bind(self), 50);
          if(self.options.communities) {
            self.initializeCommunitySelect();

          }           
        }.bind(self));
          
      }.bind(self),
    });
  },
 
  renderTasks: function () {
    var self=this,
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
      url: '/api/admin/community/taskmetrics/'+ this.communityId +'?group=' + group + '&filter=' + filter,
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
        data.community = self.community; 
         
        if(data.community.duration=='Ad Hoc'){
          var template = _.template(AdminCommunityTasks)(data);
          $('#search-results-loading').hide();     
          self.$('.task-metrics').html(template);
          self.$el.localize();
          self.$('.task-metrics').show();
          self.$('.group').val(group);  
          self.$('input[name=type][value="' + filter +'"]').prop('checked', true); 
        }       
      }.bind(this),
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
    var currentYear = today.getFullYear();  
    currentYear = currentYear.toString();
    var previousYear = parseInt(currentYear)-1; 
    previousYear=previousYear.toString();
   
    var Myear= [previousYear];  
    var previousYearRange= [];
    previousYearRange  = _.filter(data.range, function (di) {
      return _.contains(Myear, di.slice(0,4));
    });
    var months=[previousYear+'01',+previousYear+'02',previousYear+'03',
      +previousYear+'04',+previousYear+'05',+previousYear+'06',+previousYear+'07',
      +previousYear+'08',+previousYear+'09',+previousYear+'10',+previousYear+'11',
      +previousYear+'12'];

    if(previousYearRange.length>0){
      var updateArray= _.difference(months,previousYearRange); 
      var previousYearData=_.chain(updateArray).sort().value(); 
      var previousYearDataUnion= _.union(previousYearData,previousYearRange).sort();
    }
    var currentMYear= [currentYear]; 
    var currentYearRange  = _.filter(data.range, function (di) {
      return _.contains(currentMYear, di.slice(0,4));
    });
   
    var year = today.getFullYear();
    var month = (today.getMonth()+ 1).toString();        
    var currentYearMonth;      
    if(month.length<2){
      currentYearMonth = year +'0'+ month;
    }
    else{
      currentYearMonth= year +''+ month;
    }      
    var monthsCurrent=[currentYear+'01',+currentYear+'02',currentYear+'03',
      +currentYear+'04',+currentYear+'05',+currentYear+'06',+currentYear+'07',
      +currentYear+'08',+currentYear+'09',+currentYear+'10',+currentYear+'11',
      +currentYear+'12'];

    monthsCurrent= _.filter(monthsCurrent,function (e){
      return  e <= currentYearMonth;
    });
    if(currentYearRange.length>0 || previousYearRange.length>0){
      var updateCurrentArray= _.difference(monthsCurrent,currentYearRange); 
      var currentYearData=_.chain(updateCurrentArray).sort().value(); 
      var currentYearDataUnion= _.union(currentYearData,currentYearRange).sort();  
      data.range=_.union(currentYearDataUnion,previousYearDataUnion).sort(function (a, b) { return b-a; });
    }
    else{
      data.range=[];
    }
  },

  generateQuartersDisplay: function (data){
    var today = new Date();
    var currentYear = today.getFullYear();  
    currentYear = currentYear.toString();
    var previousYear = parseInt(currentYear)-1;
    previousYear= previousYear.toString();
    var Myear= [previousYear];  
    var previousYearRange= [];
    previousYearRange  = _.filter(data.range, function (di) {
      return _.contains(Myear, di.slice(0,4));
    });
    var months=[previousYear+'1',previousYear+'2',previousYear+'3',
      previousYear+'4'];
    if(previousYearRange.length>0){
      var updateArray= _.difference(months,previousYearRange); 
      var previousYearData=_.chain(updateArray).sort().value(); 
      var previousYearDataUnion= _.union(previousYearData,previousYearRange).sort();
    }
    var currentMYear= [currentYear];
    var currentYearRange=[];
    currentYearRange  = _.filter(data.range, function (di) {
      return _.contains(currentMYear, di.slice(0,4));
    });
    
    var monthsCurrent=[currentYear+'1',currentYear+'2',currentYear+'3',
      currentYear+'4'];
    var currentQuarter=this.quarter();
    monthsCurrent= _.filter(monthsCurrent,function (m){
      return  m <= currentQuarter;
    });
    if(currentYearRange.length>0 || previousYearRange.length>0){
      var updateCurrentArray= _.difference(monthsCurrent,currentYearRange); 
      var currentYearData=_.chain(updateCurrentArray).sort().value(); 
      var currentYearDataUnion= _.union(currentYearData,currentYearRange).sort();  
      data.range=_.union(currentYearDataUnion,previousYearDataUnion).sort(function (a, b) { return b-a; });
    }
    else{
      data.range=[];
    }
  },
  loadInteractionsData: function (callback) {
    $.ajax({
      url: '/api/admin/community/interactions/' + this.communityId,
      dataType: 'json',
      success: function (interactions) {
        interactions.count = _(interactions).reduce(function (sum, value, key) {
          return sum + value;
        }, 0);
        callback(interactions);
      },
    });
  },

  
  loadCyclicalInteractionsData: function (callback) { 
   
    var self= this;
    var cycleId = self.cycleId; 
  
    $.ajax({
      url: '/api/admin/community/interactions/' + self.communityId +'/cyclical/'+ cycleId,
      dataType: 'json',
      success: function (interactions) {
        interactions.count = _(interactions).reduce(function (sum, value, key) {
          return sum + value;
        }, 0);
        callback(interactions);
      },
    });
  },

  initializeCommunitySelect: function () {
    setTimeout(function () {
      $('#communities').select2({
        placeholder: 'Select a community',
        allowClear: false,
      });
      try {
        $('#s2id_communities').children('.select2-choice').children('.select2-search-choice-close').remove();
      } catch (error) { /* swallow exception because close image has already been removed*/ }
    }, 50);
  },

  changeCommunity: function (event) {
    if($('#communities').val()) {
      Backbone.history.navigate('/admin/community/' + $('#communities').val(), {trigger:true, replace:true });
     
    } 
  },
  changeCycles: function (event) {   
    this.rendertasksInteractionsCyclical(); 
  },

  renderActivities: function (self, data) {
    var template = _.template(AdminCommunityDashboardActivitiesTemplate)(data);  
    self.$('.activity-block').html(template);  
    if(this.community.cycles && this.community.cycles.length>0){
      self.$('.activity-block .usajobs-section-header').addClass('admin-separator');
    }
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
  },

  fetchData: function (self) {
    $.ajax({
      url: '/api/admin/community/'+ this.communityId + '/activities',
      dataType: 'json',
      success: function (activityData) {
        self.renderActivities(self, activityData);
      }.bind(this),
    });
  },

  getDefaultCycle: function () {
    this.cycles = this.community.cycles;
    var previousEnd = '';
    var today = new Date();
    var selectedCycle;
    _(this.cycles).each(function (cycle, i){
      var currentStart = new Date(cycle.postingStartDate);
      var currentEnd = new Date(cycle.postingEndDate);
      
      if (!selectedCycle) { selectedCycle = cycle; }
      if(previousEnd === '') { previousEnd = currentEnd; }

      if (currentEnd.getTime() >= previousEnd.getTime()){
        if (currentStart.getTime() <= today.getTime()) {
          previousEnd = currentEnd;
          selectedCycle = cycle;
        }
      } 
    });
    this.cycles= _.sortBy(this.cycles,'postingStartDate').reverse();
    var sortedArray = _.reject(this.cycles, function (c) {
      return c.cycleId== selectedCycle.cycleId;
    });
    this.cycles= (sortedArray.reverse().concat(selectedCycle)).reverse(); 
  },

  cleanup: function () {
    removeView(this);
  },

});

module.exports = AdminCommunityView;
