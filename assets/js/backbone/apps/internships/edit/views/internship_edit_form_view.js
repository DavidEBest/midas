var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var UIConfig = require('../../../../config/ui.json');
var marked = require('marked');
var MarkdownEditor = require('../../../../components/markdown_editor');
var TagFactory = require('../../../../components/tag_factory');
var ShowMarkdownMixin = require('../../../../components/show_markdown_mixin');

var InternshipEditFormTemplate = require('../templates/internship_edit_form_template.html');
var InternshipPreviewTemplate = require('../templates/internship_preview_template.html');
var InternshipLanguagePreviewTemplate = require('../templates/internship_language_preview.html');
var InternshipCommunityTemplate = require('../templates/internship_community_template.html');
var InternshipStepsTemplate = require('../templates/internship_step_template.html');
var ModalComponent = require('../../../../components/modal');

var InternshipEditFormView = Backbone.View.extend({

  events: {
    'blur .validate'                            : 'validateField',
    'change .validate'                          : 'validateField',
    'click #change-owner'                       : 'displayChangeOwner',
    'click #add-participant'                    : 'displayAddParticipant',
    'click #add-language'                       : 'toggleLanguagesOn',
    'click #cancel-language'                    : 'toggleLanguagesOff',  
    'click #save-language'                      : 'saveLanguage',
    'click .internship-button'                  : 'submit',   
    'click .expandorama-button-skills'          : 'toggleAccordion1',
    'click .expandorama-button-team'            : 'toggleAccordion2',
    'click .expandorama-button-keywords'        : 'toggleAccordion3',
    'click #deleteLink'                         : 'deleteLanguage',
    'change input[name=internship-timeframe]'   : 'changedInternsTimeFrame',
    'change #student-programs'                  : 'communitySelected',
    
  },

  initialize: function (options) {
    _.extend(this, Backbone.Events);

    var view                    = this;
    this.options                = options;
    this.tagFactory             = new TagFactory();
    this.owner                  = this.model.get( 'owner' );
    this.agency                 = this.owner ? this.owner.agency : window.cache.currentUser.agency;
    this.data                   = {};
    this.data.newTag            = {};
    this.dataLanguageArray      = [];
    this.deleteLanguageArray    = [];
    this.cycles                 = [];
    this.bureaus                = [];
    this.offices                = {};
    this.suggestedClearances    = [];
    this.currentOffices         = [];
    this.tagSources = options.tagTypes;  
    this.countryCode            = '';
    this.communityId= '';
    this.communities=  {};
    this.supportEmail           = '';

    this.initializeListeners();

    this.listenTo(this.options.model, 'task:update:success', function (data) {
      Backbone.history.navigate('internships/' + data.attributes.id, { trigger: true });
      if(data.attributes.state == 'submitted') {
        this.modalComponent = new ModalComponent({
          el: '#site-modal',
          id: 'submit-opp',
          modalTitle: 'Submitted',
          modalBody: 'Thanks for submitting <strong>' + data.attributes.title + '</strong>. We\'ll review it and let you know if it\'s approved or if we need more information.',
          primary: {
            text: 'Close',
            action: function () {
              this.modalComponent.cleanup();
            }.bind(this),
          },
          secondary: {
            text: 'Create another internship',
            action: function () {
              Backbone.history.navigate('/tasks/create?target=students', { trigger: true });
              this.modalComponent.cleanup();
            }.bind(this),
          },
        }).render();
      }
    });
    this.listenTo(this.options.model, 'task:update:error', function (model, response, options) {
      var error = options.xhr.responseJSON;
      if (error && error.invalidAttributes) {
        for (var item in error.invalidAttributes) {
          if (error.invalidAttributes[item]) {
            message = _(error.invalidAttributes[item]).pluck('message').join(',<br /> ');
            $('#' + item + '-update-alert-message').html(message);
            $('#' + item + '-update-alert').show();
          }
        }
      } else if (error) {
        var alertText = response.stateText + '. Please try again.';
        $('.alert.alert-danger').text(alertText).show();
        $(window).animate({ scrollTop: 0 }, 500);
      }
    });
  },

 

  render: function () {
    this.initializeBureaus();
    this.initializeSuggestedClearance();
    this.getSupportEmail();
    this.data = {
      data: this.model.toJSON(),
      tagTypes: this.options.tagTypes,
      newTags: [],
      newItemTags: [],
      tags: this.options.tags,
      madlibTags: organizeTags(this.model.toJSON().tags),
      ui: UIConfig,
      agency: this.agency,
      languageProficiencies: this.options.languageProficiencies,
      suggestedClearances: this.suggestedClearances,
      cycles: this.cycles, 
      bureaus: this.bureaus,
      supportEmail: this.supportEmail,
    };
   
    var compiledTemplate = _.template(InternshipEditFormTemplate)(this.data);      
    this.$el.html(compiledTemplate);
    this.$el.localize(); 
    this.loadAudienceCommunityData();
   
    if(this.data.data.canEditTask){
      this.initializeCycle(this.data.data.communityId);
      this.renderSteps(); 
    }
    
    if(this.model.attributes.language && this.model.attributes.language.length>0){
      this.dataLanguageArray = this.model.attributes.language; 
    }
    
    // if (this.cycles.length > 0) {
    this.renderLanguages();
    this.initializeFormFields();
    this.initializeCountriesSelect();
    this.initializeLanguagesSelect();
    this.initializeSelect2(); 
    this.initializeTextAreaDetails();
    this.initializeTextAreaSkills();
    this.initializeTextAreaTeam();
    this.initializeCommunityDropDown();
    this.characterCount();
     
    
    if(!_.isEmpty(this.data['madlibTags'].keywords)) {
      $('#keywords').siblings('.expandorama-button').attr('aria-expanded', true);
      $('#keywords').attr('aria-hidden', false);
    }
    // }

    this.$( '.js-success-message' ).hide();
    $('#search-results-loading').hide();
    return this;
  },
  renderSaveSuccessModal: function () {
    var $modal = this.$( '.js-success-message' );
    $modal.slideDown( 'slow' );
    $modal.one('mouseout', function () {
      _.delay( _.bind( $modal.slideUp, $modal, 'slow' ), 4200 );
    });
  },

  validateField: function (e) {
    return validate(e);
  },
  
  changedInternsTimeFrame: function (e){
    if($('[name=internship-timeframe]:checked').length>0){ 
      $('#internship-start-End').removeClass('usa-input-error');        
      $('#internship-start-End>.field-validation-error').hide();
    }
  },

  deleteLanguage:function (e){
    var dataAttr=$(e.currentTarget).attr('data-id');
    this.deleteLanguageArray.push(this.dataLanguageArray[dataAttr]);      
    var updateArray= _.difference(this.dataLanguageArray,this.deleteLanguageArray);   
    this.dataLanguageArray= updateArray;
    this.renderLanguages(); 
  },

  validateLanguage:function (e){
    var abort=false;   
    
    if($('#languageId').val() ==''){
      $('#language-select').addClass('usa-input-error'); 
      $('span#lang-id-val.field-validation-error').show();
      abort=true;
    }
    else{
      $('span#lang-id-val.field-validation-error').hide(); 
    }

    if(abort) {
      $('.usa-input-error').get(0).scrollIntoView();
    }
    return abort; 
  },
  
  getDataFromLanguagePage: function (){
    var modelData = {
      languageId:$('#languageId').val(),
      readSkillLevel:$('[name=read-skill-level]:checked + label').text(), 
      readingProficiencyId:$('[name=read-skill-level]:checked').val(), 
      selectLanguage:$('#languageId').select2('data').value,      
      speakingProficiencyId:$('[name=spoken-skill-level]:checked').val(),
      spokenSkillLevel:$('[name=spoken-skill-level]:checked + label').text(),
      writingProficiencyId:$('[name=written-skill-level]:checked').val(),
      writtenSkillLevel:$('[name=written-skill-level]:checked + label').text(),
    };
    return modelData;
  },

  saveLanguage:function (){
    if(!this.validateLanguage()){
      this.toggleLanguagesOff();
      var data = this.getDataFromLanguagePage();
      if (_.filter(this.dataLanguageArray, function (language) {
        return  language.languageId == data.languageId;
      }).length) {
        var index = _.findIndex(this.dataLanguageArray, function (language) {
          return language.languageId == data.languageId;
        });
        this.dataLanguageArray[index] = data;
      } else {
        this.dataLanguageArray.push(data);
      }
      this.renderLanguages();
      $('#lang-1').get(0).scrollIntoView();
    }
  },

  renderLanguages: function () {
    var languageTemplate = _.template(InternshipLanguagePreviewTemplate)({
      data: this.dataLanguageArray,     
    });
    $('#lang-1').html(languageTemplate);
  }, 

  renderCommunity:function (){
    this.loadAudienceCommunityData();
    var communityData = {
      communities: this.communities,
    };
    var compiledTemplate = _.template(InternshipCommunityTemplate)(communityData);  
    $('#community-preview-id').html(compiledTemplate);    
    setTimeout(function () {
      $('#search-results-loading').hide();
    }, 50);
   
  },
 

  renderInitialize: function (){
    
    this.initializeBureaus();
    this.initializeSuggestedClearance();
  
    this.renderLanguages();
    this.initializeFormFields();
    this.initializeCountriesSelect();
    this.initializeLanguagesSelect();
    this.initializeSelect2(); 
    this.initializeTextAreaDetails();
    this.initializeTextAreaSkills();
    this.initializeTextAreaTeam();
    this.initializeCommunityDropDown();
     
    
    if(!_.isEmpty(this.data['madlibTags'].keywords)) {
      $('#keywords').siblings('.expandorama-button').attr('aria-expanded', true);
      $('#keywords').attr('aria-hidden', false);
    }
    this.$( '.js-success-message' ).hide();
    $('#search-results-loading').hide();
    return this;
  },
  renderSteps:function (){
     
    var stepTemplate;
  
    stepTemplate = _.template(InternshipStepsTemplate)(this.data);  
    $('#internships-form-steps').html(stepTemplate);    
    setTimeout(function () {
      $('#search-results-loading').hide();
    }, 50);
    
  },

  initializeFormFields: function (){
    $('#needed-interns').val(this.model.attributes.interns);
    $('input[name=internship-timeframe][value=' + this.model.attributes.cycleId +']').prop('checked', true);
    if (this.model.attributes.suggestedSecurityClearance) {
      $('#task_tag_suggested_clearance').val(this.model.attributes.suggestedSecurityClearance);
    }
    if (this.model.attributes.bureau) {
      $('#task_tag_bureau').val(this.model.attributes.bureau.bureauId);
    }
    if (this.model.attributes.office) {
      $('#task_tag_office').val(this.model.attributes.officeId);
    }
    if (this.model.attributes.cityName) {
      $('#task_tag_city').val(this.model.attributes.cityName);
    }
  },

  loadAudienceCommunityData: function () {
    $.ajax({
      url: '/api/task/communities',
      type: 'GET',
      async: false,
      success: function (data){
        this.communities = data;
        if (!this.communities.student.length) {
          this.getSupportEmail();
          this.$('#student-community-member-error').show();
        } else {
          var USDOS = _.findWhere(this.communities.student, { communityName: 'U.S. Department of State Student Internship Program (Unpaid)' }) || {};
          this.communityId = USDOS.communityId;
          this.initializeCycle(this.communityId);
        }
      }.bind(this),
    });
  },

  getSupportEmail: function () {
    $.ajax({
      url: '/api/task/community/supportEmail',
      type: 'GET',
      async: false,
      success: function (data){
        this.supportEmail = data[0].supportEmail;
      }.bind(this),
    });
  },
  
  initializeSelect2: function () {
    var formatResult = function (object) {
      var formatted = '<div class="select2-result-title">';
      formatted += _.escape(object.name || object.title);
      formatted += '</div>';
      if (!_.isUndefined(object.description)) {
        formatted += '<div class="select2-result-description">' + marked(object.description) + '</div>';
      }
      return formatted;
    };
   
    this.tagFactory.createTagDropDown({
      type: 'skill',
      placeholder: 'Start typing to select a skill',
      selector: '#task_tag_skills',
      width: '100%',
      tokenSeparators: [','],
      data: this.data['madlibTags'].skill,
      maximumSelectionSize: 5,
      maximumInputLength: 35,
    });


    this.tagFactory.createTagDropDown({
      type: 'keywords',
      selector: '#task_tag_keywords',
      placeholder: 'Start typing to select a keyword',
      width: '100%',
      data: this.data['madlibTags'].keywords,
      maximumSelectionSize: 5,
      maximumInputLength: 35,
    });

    $('#task_tag_suggested_clearance').select2({
      placeholder: 'Select a suggested security clearance',
      width: '100%',
      allowClear: true,
    });

    $('#task_tag_bureau').select2({
      placeholder: 'Select a bureau',
      width: '100%',
      allowClear: true,
    });

    if(this.cycles.length>0 && !this.checkDosBureau()){
      if($('#task_tag_bureau').select2('data')) {
        this.showOfficeDropdownOnRender();
      }
    }
    $('#task_tag_bureau').on('change', function (e) {    
      this.showOfficeDropdown();   
    }.bind(this));

    //adding this for select 2 as binding messed with it
    $('#task_tag_office').select2({
      placeholder: 'Select an office',
      width: '100%',
      allowClear: true,
      data: function () { 
        return {results: this.currentOffices}; 
      }.bind(this),
    });
  },

  showOfficeDropdownOnRender: function () {
    if($('#task_tag_bureau').select2('data')) {
      var selectData = $('#task_tag_bureau').select2('data');
      this.currentOffices = this.offices[selectData.id];
      if (this.currentOffices.length) {
        $('.task_tag_office').show();
      } else {
        $('#task_tag_office').attr('disabled', true).removeClass('validate').select2('data', null);
        $('.task_tag_office').removeClass('usa-input-error');
        $('.task_tag_office .error-empty').hide();
      }
    } else {
      $('.task_tag_office').hide();   
    }
  },

  showOfficeDropdown: function () {
    if($('#task_tag_bureau').select2('data')) {
      $('#task_tag_office').select2('data', null);
      var selectData = $('#task_tag_bureau').select2('data');
      this.currentOffices = this.offices[selectData.id];
      if (this.currentOffices.length) {
        $('.task_tag_office').show();
        $('#task_tag_office').removeAttr('disabled', true);
        $('#task_tag_office').addClass('validate');
      } else {
        $('#task_tag_office').attr('disabled', true).removeClass('validate').select2('data', null);
        $('.task_tag_office').removeClass('usa-input-error');
        $('.task_tag_office .error-empty').hide();
      }
    } else {
      $('.task_tag_office').hide();  
    }
  },
  
  initializeTextAreaDetails: function () {
    if (this.md2) { this.md2.cleanup(); }
    this.md2= new MarkdownEditor({
      data: this.model.toJSON().details,
      el: '.markdown-edit-details',
      id: 'opportunity-details',
      placeholder: '',
      title: 'What you\'ll do',
      rows: 6,
      validate: ['empty','html'],
    }).render();
  },

  initializeTextAreaSkills: function () {
    if (this.md3) { this.md3.cleanup(); }
    this.md3 = new MarkdownEditor({
      data: this.model.toJSON().outcome,
      el: '.markdown-edit-skills',
      id: 'opportunity-skills',
      placeholder: '',
      title: 'What you\'ll learn',
      rows: 6,
      validate: ['html'],
    }).render();

    if(this.model.toJSON().outcome) {
      $('#skills').siblings('.expandorama-button').attr('aria-expanded', true);
      $('#skills').attr('aria-hidden', false);
    }
  },

  initializeTextAreaTeam: function () {
    if (this.md4) { this.md4.cleanup(); }
    this.md4 = new MarkdownEditor({
      data: this.model.toJSON().about,
      el: '.markdown-edit-team',
      id: 'opportunity-team',
      placeholder: '',
      title: 'Who we are',
      rows: 6,
      validate: ['empty','html'],
    }).render();
  },

  initializeCommunityDropDown: function (){
    var communityId= this.model.toJSON().communityId;
    
    if(communityId){
      $('#student-programs').val(communityId);
    }
  },

  

  characterCount: function () {
    $('.markdown-edit-details .usajobs-form__help-brief').append('  <span id="opportunity-details-count">(5000 characters remaining)</span>');
    $('.markdown-edit-team .usajobs-form__help-brief').append('  <span id="opportunity-team-count">(5000 characters remaining)</span>');
    $('#intern-title').charCounter(100, {
      container: '#opportunity-title-count',
    });
    $('#opportunity-details').charCounter(5000, {
      container: '#opportunity-details-count',
    });
    $('#opportunity-team').charCounter(5000, {
      container: '#opportunity-team-count',
    });
  },

  initializeCycle: function (communityId) {
    $.ajax({
      url: '/api/community/' + communityId + '/cycles', 
      type: 'GET',
      async: false,
      success: function (data) {
        var cycle = this.model.get('cycle');
        this.cycles = data;
        if (cycle && new Date(cycle.applyStartDate) < new Date()) {
          this.cycles = [cycle];
        } else if (cycle && !_.findWhere(this.cycles, { cycleId: cycle.cycleId })) {
          this.cycles.push(cycle);
        }
        this.cycles = _.sortBy(this.cycles, 'postingStartDate');
        if(this.cycles.length>0){       
          if(this.checkDosBureau()){
            this.$('#no-bureau-office-error').show();
            this.$('#internship-edit').hide();
          }
          else {
            this.$('#no-bureau-office-error').hide();
            this.$('#internship-edit').show();
            this.data.cycles=this.cycles;       
            this.renderSteps();                      
            this.renderInitialize(); 
          }                     
        }
        else{
          this.$('#cycle-error').show();
          this.$('#internship-edit').hide();
        }       
      }.bind(this),
    });
  },

  checkDosBureau: function () {
    if(window.cache.currentUser && window.cache.currentUser.bureauOffice.length>0) {
      return false;
    } else {
      return true;
    } 
  },


  initializeBureaus: function () {
    $.ajax({
      url: '/api/enumerations/bureaus', 
      type: 'GET',
      async: false,
      success: function (data) {
        for (var i = 0; i < data.length; i++) {
          this.offices[data[i].bureauId] = data[i].offices ? data[i].offices : [];
        }
        this.bureaus = data.sort(function (a, b) {
          if(a.name < b.name ) { return -1; }
          if(a.name > b.name ) { return 1; }
          return 0;
        });
      }.bind(this),
    });
  },

  initializeSuggestedClearance: function () {
    this.suggestedClearances =  [
      {id: 0, name: 'None'},
      {id: 1, name: 'Interim Secret'},
      {id: 2, name: 'Interim Top Secret'},
      {id: 3, name: 'Secret'},
      {id: 4, name: 'Top Secret'},
      {id: 5, name: 'Top Secret/SCI'},
    ];
  },

  initializeListeners: function () {
    this.on( 'internship:tags:save:done', function (event) {
      var modelData = this.getDataFromPage();
      if (event.draft) {
        modelData.state = 'draft';
        modelData.acceptingApplicants = true;      
      } else if (!event.saveState) {
        modelData.state = 'submitted';
        modelData.acceptingApplicants = true;      
      }
      this.cleanup();
      this.options.model.trigger( modelData.id ? 'task:update' : 'task:save', modelData );
    });
  },

  toggleAccordion1: function (e) {
    var element = $(e.currentTarget);
    this.data.accordion1.open = !this.data.accordion1.open;
    element.attr('aria-expanded', this.data.accordion1.open);
    element.siblings('.expandorama-content').attr('aria-hidden', !this.data.accordion1.open);
  },

  toggleAccordion2: function (e) {
    var element = $(e.currentTarget);
    this.data.accordion2.open = !this.data.accordion2.open;
    element.attr('aria-expanded', this.data.accordion2.open);
    element.siblings('.expandorama-content').attr('aria-hidden', !this.data.accordion2.open);
  },

  toggleAccordion3: function (e) {
    var element = $(e.currentTarget);
    this.data.accordion3.open = !this.data.accordion3.open;
    element.attr('aria-expanded', this.data.accordion3.open);
    element.siblings('.expandorama-content').attr('aria-hidden', !this.data.accordion3.open);
  },

  resetLanguages:function (e){
    $('#languageId').select2('data', null);  
    $("input[name='spoken-skill-level'][id='spoken-none']").prop('checked', true);
    $("input[name='written-skill-level'][id='written-none']").prop('checked', true);
    $("input[name='read-skill-level'][id='read-none']").prop('checked', true);
  },

  toggleLanguagesOn: function (e) {
    this.resetLanguages();
    $('.usajobs-form__title').hide();
    $('.usajobs-form__title').attr('aria-hidden');
    $('#step-1').hide();
    $('#step-1').attr('aria-hidden');
    $('#step-2').hide();
    $('#step-2').attr('aria-hidden');
    $('#step-3').hide();
    $('#step-3').attr('aria-hidden');
    $('#button-bar').hide();    
    $('#community-preview-id').hide();
    $('#button-bar').attr('aria-hidden');
    $('#add-languages-fieldset').show();
    $('#add-languages-fieldset').removeAttr('aria-hidden');
    window.scrollTo(0, 0);
  },

  toggleLanguagesOff: function (e) {
    $('.usajobs-form__title').show();
    $('.usajobs-form__title').removeAttr('aria-hidden');
    $('#step-1').show();
    $('#step-1').removeAttr('aria-hidden');
    $('#step-2').show();
    $('#step-2').removeAttr('aria-hidden');
    $('#step-3').show();
    $('#step-3').removeAttr('aria-hidden');
    $('#button-bar').show();
    $('#button-bar').removeAttr('aria-hidden');
    $('#add-languages-fieldset').hide();
    $('#add-languages-fieldset').attr('aria-hidden');
    $('span#lang-id-val.field-validation-error').hide();
    $('#language-select').removeClass('usa-input-error');
    window.scrollTo(0, 0);
  },

  validateFields: function () {
    var children = this.$el.find( '.validate' );
    var abort = false;
    
    if($('[name=internship-timeframe]:checked').length==0){ 
      $('#internship-start-End').addClass('usa-input-error');    
      $('#internship-start-End>.field-validation-error').show();
      abort=true;
    }

    _.each( children, function ( child ) {
      var iAbort = validate( { currentTarget: child } );
      abort = abort || iAbort;
    } );

    if(abort) {
      $('.usa-input-error').get(0).scrollIntoView();
    }
    
    return abort;
  },

  initializeLanguagesSelect: function () {
    $('#languageId').select2({
      placeholder: '- Select -',
      minimumInputLength: 3,
      ajax: {
        url: '/api/ac/languages',
        dataType: 'json',
        data: function (term) {       
          return { q: term };
        },
        results: function (data) {         
          return { results: data };
        },
      },
      dropdownCssClass: 'select2-drop-modal',
      formatResult: function (obj, container, query) {
        return (obj.unmatched ? obj[obj.field] : _.escape(obj[obj.field]));
      },
      formatSelection: function (obj, container, query) {
        return (obj.unmatched ? obj[obj.field] : _.escape(obj[obj.field]));
      },
      formatNoMatches: 'No languages found ',
    });

    $('#languageId').on('change', function (e) {
      validate({ currentTarget: $('#languageId') });
      if($('#languageId').val() !=''){
        $('span#lang-id-val.field-validation-error').hide();
        $('#language-select').removeClass('usa-input-error');   
      }
    }.bind(this));
    $('#s2id_languageId').focus();
  },
  
  initializeCountriesSelect: function () {  
    var country= this.model.attributes.country;
    $('#task_tag_country').select2({    
      placeholder: '- Select -',    
      minimumInputLength: 3,  
      ajax: {
        url: '/api/ac/country',
        dataType: 'json',       
        data: function (term) {       
          return { q: term };
        },
        results: function (data) {              
          return { results: data };
        },
      },
      
      dropdownCssClass: 'select2-drop-modal',
      formatResult: function (obj, container, query) {
        return (obj.unmatched ? obj[obj.field] : _.escape(obj[obj.field]));
      },

      formatSelection: function (obj, container, query) {
        return (obj.unmatched ? obj[obj.field] : _.escape(obj[obj.field]));
      },

      formatNoMatches: 'No country found ',

      initSelection:function (element,callback){
        if(country){
          var data= {
            code: country.code,
            countryId: country.countryId,
            field: 'value',
            id: country.id,
            value: country.value, 
          };
          this.countryCode = country.code;
          this.loadCountrySubivisionData();
          callback(data);
        }
      }.bind(this),

    }).select2('val', []);

    $('#task_tag_country').on('change', function (e) {
      validate({ currentTarget: $('#task_tag_country') });
      this.countryCode = $('#task_tag_country').select2('data')?$('#task_tag_country').select2('data').code:null;
      this.countryCode && this.loadCountrySubivisionData();
    }.bind(this));

    $('#s2id_task_tag_country').focus();
  
  },

  loadCountrySubivisionData: function () {
    $.ajax({
      url: '/api/ac/countrySubdivision/' + this.countryCode,
      dataType: 'json',
    }).done(function (data) {
      this.initializeCountrySubdivisionSelect(data);
    }.bind(this));
  },
 
  initializeCountrySubdivisionSelect: function (data) {
    var countrySubdivision = this.model.attributes.countrySubdivision;
    $('#task_tag_countrySubdivision').select2({
      placeholder: '- Select -',
      data: { results: data, text: 'value' },
      dropdownCssClass: 'select2-drop-modal',
      formatResult: function (item) {
        return item.value;
      },
      formatSelection: function (item) {
        return item.value;
      },
      formatNoMatches: 'No state found ',
    });
    if (data.length) {
      $('#task_tag_countrySubdivision').removeAttr('disabled', true);
      $('#task_tag_countrySubdivision').addClass('validate');
      if(countrySubdivision) {
        $('#task_tag_countrySubdivision').val(countrySubdivision.id).trigger('change.select2');
      }
    } else {
      $('#task_tag_countrySubdivision').attr('disabled', true);
      $('#task_tag_countrySubdivision').removeClass('validate');
      $('.task_tag_countrySubdivision').removeClass('usa-input-error');
      $('.task_tag_countrySubdivision > .field-validation-error').hide();
    }
  
    $('#task_tag_countrySubdivision').on('change', function (e) {
      if ($('#task_tag_country').val() == 'United States') {
        validate({ currentTarget: $('#task_tag_countrySubdivision') });
      }  
    });
  },
  
  submit: function (e) {
    if ( e.preventDefault ) { e.preventDefault(); }
    if ( e.stopPropagation ) { e.stopPropagation(); }
    switch ($(e.currentTarget).data('state')) {
      case 'cancel':
        if(this.model.attributes.id) {
          Backbone.history.navigate('internships/' + this.model.attributes.id, { trigger: true });
        } else {
          window.history.back();
        }
        break;
      case 'preview':
        if (!this.validateFields()) {
          this.preview(true);
        }
        break;
      case 'edit':
        this.preview(false);
        break;
      default:
        this.save(e);
        break;
    }
  },

  preview: function (showPreview) {
    if(showPreview) {
      $('#search-results-loading').show();
      var data = this.getDataFromPage();
      _.each(['description', 'details', 'about'], function (part) {
        if(data[part]) {
          data[part + 'Html'] = marked(data[part]);
        }
      });
      var tags = _(this.getTagsFromInternPage()).chain().map(function (tag) {
        if (!tag || !tag.id) { return; }
        return { name: tag.name, type: tag.type || tag.tagType };
      }).compact().value();

      var compiledTemplate = _.template(InternshipPreviewTemplate)({
        data:data,
        madlibTags:this.organizeTags(tags),
      });
  
      $('#internship-preview').html(compiledTemplate);
      setTimeout(function () {
        $('#search-results-loading').hide();
      }, 50);
    }
    _.each(['#cancel', '#edit', '#preview', '#save', '#internship-edit', '#internship-preview'], function (id) {
      $(id).toggle();
    });
    window.scrollTo(0, 0);
  },

  organizeTags: function (tags) {
    return _(tags).groupBy('type');
  },

  save: function ( e ) {
    if ( e.preventDefault ) { e.preventDefault(); }
    var abort = this.validateFields();
    if ( abort === true ) {
      return;
    }
    switch ($(e.currentTarget).data('state')) {
      case 'draft':
        this.trigger( 'internship:tags:save:done', { draft: true } );
        break;
      case 'submit':
        this.trigger( 'internship:tags:save:done', { draft: false, saveState: false } );
        break;
      default:
        this.trigger( 'internship:tags:save:done', { draft: false, saveState: true } );
        break;
    }
  },

  displayChangeOwner: function (e) {
    e.preventDefault();
    this.$('.project-owner').hide();
    this.$('.change-project-owner').show();

    return this;
  },

  displayAddParticipant: function (e) {
    e.preventDefault();
    this.$('.project-no-people').hide();
    this.$('.add-participant').show();

    return this;
  },
  
  getDataFromPage: function () {
    var modelData = {
      id                            : this.model.get('id'),
      description                   : this.$('#opportunity-details').val(),
      communityId                   : this.communityId,
      title                         : this.$('#intern-title').val(),
      details                       : this.$('#opportunity-details').val(),  
      about                         : this.$('#opportunity-team').val(),
      submittedAt                   : this.$('#js-edit-date-submitted').val() || null,
      publishedAt                   : this.$('#publishedAt').val() || null,
      assignedAt                    : this.$('#assignedAt').val() || null,
      completedAt                   : this.$('#completedAt').val() || null,
      state                         : this.model.get('state'),
      restrict                      : this.model.get('restrict'),
      language                      : this.dataLanguageArray,
      location                      : this.$('.opportunity-location .selected').attr('id'),
      countryId                     : this.$('#task_tag_country').val() || null,
      countrySubdivisionId          : this.$('#task_tag_countrySubdivision').select2('data') ? this.$('#task_tag_countrySubdivision').val() : null,
      country                       : null,
      countrySubdivision            : null,
      cityName                      : null,
      bureau_id                     : this.$('#task_tag_bureau').select2('data').id,
      office_id                     : this.$('#task_tag_office').select2('data') ? this.$('#task_tag_office').select2('data').id : null,
      suggestedSecurityClearance    : this.$('#task_tag_suggested_clearance').select2('data').text,
      bureauName                    : this.$('#task_tag_bureau').select2('data').text,
      officeName                    : this.$('#task_tag_office').select2('data') ? this.$('#task_tag_office').select2('data').text : null,
      interns                       : this.$('#needed-interns').val(),
      cycleId                       : this.$('input[name=internship-timeframe]:checked').attr('id'),
      cycleStartDate                : this.$('input[name=internship-timeframe]:checked').attr('data-cycleStartDate'),
      cycleEndDate                  : this.$('input[name=internship-timeframe]:checked').attr('data-cycleEndDate'),
      cycleName                     : this.$('input[name=internship-timeframe]:checked').val(),
    };
  
    if($('.opportunity-location.selected').val() !== 'anywhere') {
      modelData.country             = this.$('#task_tag_country').select2('data').value;
      modelData.countrySubdivision  = this.$('#task_tag_countrySubdivision').select2('data') ? this.$('#task_tag_countrySubdivision').select2('data').value : null;
      modelData.cityName            = this.$('#task_tag_city').val();
    }
    
    modelData.tags = _(this.getTagsFromInternPage()).chain().map(function (tag) {
      if (!tag || !tag.id) { return; }
      return (tag.id && tag.id !== tag.name) ? parseInt(tag.id, 10) : {
        name: tag.name,
        type: tag.tagType,
        data: tag.data,
      };
    }).compact().value();

    return modelData;
  },

  getTagsFromInternPage: function () {
    var tags = [];
    tags.push.apply(tags,this.$('#task_tag_skills').select2('data'));
    return tags;
  },

  getOldTags: function () {
    var oldTags = [];
    for (var i in this.options.tags) {
      oldTags.push({
        id: parseInt(this.options.tags[i].id),
        tagId: parseInt(this.options.tags[i].tag.id),
        type: this.options.tags[i].tag.type,
      });
    }

    return oldTags;
  },

  cleanup: function () {
    if (this.md1) { this.md1.cleanup(); }
    if (this.md2) { this.md2.cleanup(); }
    if (this.md3) { this.md3.cleanup(); }
    if (this.md4) { this.md4.cleanup(); }  
    removeView(this);
  },
});

_.extend(InternshipEditFormView.prototype, ShowMarkdownMixin);

module.exports = InternshipEditFormView;
