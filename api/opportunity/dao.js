const _ = require('lodash');
const dao = require('postgres-gen-dao');
const moment = require('moment');
const util = require('util');

const applicationTaskQuery= 'select application.* from application ' +  
'join application_task on application_task.application_id= application.application_id ' +
'where application_task.user_id= ? and application_task.task_id= ? ';

const countryQuery= 'select country.country_id as "id", country.country_id as "countryId",country.code,country.value ' +
  'from country ' + 'join task on country.country_id = task.country_id ' + 
  'where task."userId" = ? and task.id = ? ';

const countrySubdivisionQuery = 'select country_subdivision.country_subdivision_id as "countrySubdivisionId",country_subdivision.country_subdivision_id as "id", country_subdivision.code, country_subdivision.value ' +
  'from country_subdivision ' + 'join task on country_subdivision.country_subdivision_id = task.country_subdivision_id ' + 
  'where task."userId" = ? and task.id = ? ';

const communityUserQuery = 'select * from community_user '+
  'inner join community on community_user.community_id = community.community_id ' + 
  'where community_user.user_id = ? and community_user.community_id= ?';

const communityAdminsQuery = 'select midas_user.* from midas_user ' +
  'inner join community_user on community_user.user_id = midas_user.id '+
  'inner join community on community_user.community_id = community.community_id ' + 
  'where community_user.is_manager and midas_user.disabled = false and community.community_id = ?';

const communityBureauAdminsQuery = 'select midas_user.* from midas_user ' +
  'inner join community_user on community_user.user_id = midas_user.id ' +
  'inner join community on community_user.community_id = community.community_id ' +
  'where community_user.is_manager and midas_user.disabled = false ' +
  'and community.community_id = ? and midas_user.bureau_id = ?';

const communitiesQuery = 'SELECT ' +
    'community.community_id, ' +
    'community.community_name, ' +
    'community.target_audience, ' +
    'community.reference_id ' +
  'FROM community ' +
  'WHERE ' +
    'community.is_closed_group = false ' +
  'UNION ' +
  'SELECT ' +
    'community.community_id, ' +
    'community.community_name, ' +
    'community.target_audience, ' +
    'community.reference_id ' +
  'FROM community ' +
  'JOIN community_user ' +
    'ON community_user.community_id = community.community_id ' +
  'WHERE ' +
    'community.is_closed_group = true ' +
    'AND community.is_disabled = false ' +
    'AND community_user.disabled = false ' +
    'AND community_user.user_id = ?';

const usdosSupportEmailQuery = 'select * from community where reference_id = \'dos\'';

const communityTaskQuery = 'select * from community ' +
'join task on task.community_id = community.community_id ' + 
'where task.community_id = ?';

const commentsQuery = 'select @comment.*, @user.* ' +
  'from @comment comment ' +
  'join @midas_user "user" on "user".id = comment."userId" ' +
  'where comment."taskId" = ?';

const completedInternsQuery= 'select midas_user.username, midas_user.bounced, ' +
'trim(midas_user.given_name || \' \' || midas_user.last_name) as name ' +
'from task_list_application ' +
'inner join task_list on task_list_application.task_list_id = task_list.task_list_id ' +
'inner join application on task_list_application.application_id = application.application_id ' +
'inner join midas_user  on application.user_id = midas_user.id ' +
'where  task_list.task_id = ? and application.internship_completed_at is not null ' ;


const deleteTaskTags = 'delete from tagentity_tasks__task_tags where task_tags = ?';

const languageListQuery= 'select l1.value as "spokenSkillLevel", g.language_skill_id as "languageSkillId", l3.value as "writtenSkillLevel", l2.value as "readSkillLevel", r.value as "selectLanguage", g.speaking_proficiency_id as "speakingProficiencyId",g.writing_proficiency_id as "writingProficiencyId",g.reading_proficiency_id as "readingProficiencyId",g.language_id as "languageId" ' + 
  'from lookup_code l1,language_skill g,lookup_code l2,  lookup_code l3, language r' + 
  ' where l1.lookup_code_id= g.speaking_proficiency_id and l2.lookup_code_id =g.reading_proficiency_id and r.language_id= g.language_id and l3.lookup_code_id=g.writing_proficiency_id and g.task_id=? ' +
  'order by g.language_skill_id ';

const savedTaskQuery = 'select ' +
  'task.id, task.title, task.state, task.community_id as "communityId", task."updatedAt", ' +
  'task.city_name as "cityName", csub.value as "countrySubdivision", country.value as country, ' +
  'cycle.cycle_id as "cycleId", cycle.apply_end_date as "applyEndDate", ' +
  'bureau.name as bureau, office.name as office ' +
  'from task ' +
  'join saved_task on saved_task.task_id = task.id ' +
  'left join cycle on cycle.cycle_id = task.cycle_id ' +
  'left join country_subdivision csub on csub.country_subdivision_id = task.country_subdivision_id ' +
  'left join country on country.country_id = task.country_id ' +
  'left join bureau on bureau.bureau_id = task.bureau_id ' +
  'left join office on office.office_id = task.office_id ' +
  'where saved_task.deleted_at is null and saved_task.user_id = ? and cycle.apply_end_date > now()::date';

const tasksDueQuery = 'select task.* ' +
  'from task ' +
  'where "completedBy"::date - ?::date = 0 and state = ? ';

const tasksDueDetailQuery = 'select owner.name, owner.username, owner.bounced ' +
  'from task join midas_user owner on task."userId" = owner.id ' +
  'where task.id = ? ';

const taskCommunitiesQuery='SELECT community.community_id, community.community_name, community.target_audience ' +
  'FROM community JOIN task  ON community.community_id = task.community_id ' + 'where task."userId"= ? and task.id = ? ';  

const taskQuery = 'select @task.*, @tags.*, @owner.id, @owner.name, @owner.photoId, @bureau.*, @office.* ' +
  'from @task task ' +
  'join @midas_user owner on owner.id = task."userId" ' +
  'left join tagentity_tasks__task_tags task_tags on task_tags.task_tags = task.id ' +
  'left join @tagentity tags on tags.id = task_tags.tagentity_tasks ' +
  'left join @bureau bureau on bureau.bureau_id = task.bureau_id ' +
  'left join @office office on office.office_id = task.office_id';
  
const userQuery = 'select @midas_user.*, @agency.* ' +
  'from @midas_user midas_user ' +
  'left join @agency on agency.agency_id = midas_user.agency_id  ' +
  'where midas_user.id = ? ';
   
const userTasksQuery = 'select count(*) as "completedTasks", midas_user.id, ' +
  'midas_user.username, midas_user.government_uri as "governmentUri", midas_user.name, midas_user.bounced ' +
  'from midas_user ' +
  'join volunteer v on v."userId" = midas_user.id ' +
  'join task t on t.id = v."taskId" and t."completedAt" is not null ' +
  'where v.assigned = true and v."taskComplete" = true and midas_user.id in ? ' +
  'group by midas_user.id, midas_user.username, midas_user.name';

const volunteerQuery = 'select volunteer.id, volunteer."userId", volunteer.assigned, ' +
  'volunteer."taskComplete", midas_user.name, midas_user.username, midas_user.government_uri as "governmentUri", midas_user.bounced, midas_user."photoId" ' +
  'from volunteer ' +
  'join midas_user on midas_user.id = volunteer."userId" ' +
  'where midas_user.disabled = false and volunteer."taskId" = ?';

const volunteerListQuery = 'select midas_user.username, midas_user.government_uri as "governmentUri", midas_user."photoId", midas_user.bounced, volunteer."taskComplete" ' +
  'from volunteer ' +
  'join midas_user on midas_user.id = volunteer."userId" ' +
  'where volunteer."taskId" = ? and volunteer.assigned = true';

const lookUpVanityURLQuery = 'select community_id from community where lower(vanity_url) = lower(?)';

const options = {
  task: {
    fetch: {
      owner: '',
      agency: '',
      tags: [],
      bureau: '',
      office: '',
    },
    exclude: {
      task: [ 'deletedAt' ],
      tags: [ 'deletedAt' ],
    },
  },
  user: {
    fetch: {
      agency: '',
    },
    exclude: {
      midas_user: [ 'deletedAt', 'passwordAttempts', 'isAdmin', 'isAgencyAdmin', 'disabled', 'bio',
        'createdAt', 'title', 'updatedAt' ],
    },
  },
  comment: {
    fetch: {
      user: '',
    },
    exclude: {
      comment: [ 'deletedAt' ],
      user: [
        'title', 'bio', 'isAdmin', 'disabled', 'passwordAttempts',
        'createdAt', 'updatedAt', 'deletedAt', 'completedTasks', 'isAgencyAdmin',
      ],
    },
  },
  taskVolunteer: {
    fetch: {
      user: '',
    },
  },
};

const clean = {
  tasks: function (records) {
    return records.map(function (record) {
      var cleaned = _.pickBy(record, _.identity);   
      return cleaned;
    });
  },

  task: function (record) { 
    var cleaned= _.omitBy(record, v => (_.isBoolean(v)||_.isFinite(v)) ? false : _.isEmpty(v)); 
    return cleaned;
  },

  user: function (record) {
    var cleaned = _.pickBy(record, _.identity);
    cleaned.agency = _.pickBy(cleaned.agency, _.identity);
    if (typeof cleaned.agency == 'undefined') {
      delete(cleaned.agency);
    }
    return cleaned;
  },
  comments: function (records) {
    return records.map(function (record) {
      var cleaned = _.pickBy(record, _.identity);
      cleaned.user = _.pickBy(cleaned.user, _.identity);
      return cleaned;
    });
  },
};

module.exports = function (db) {
  return {
    Agency: dao({ db: db, table: 'agency'}),
    AuditLog: dao({ db: db, table: 'audit_log' }),
    Task: dao({ db: db, table: 'task' }),
    User: dao({ db: db, table: 'midas_user' }),
    TaskTags: dao({ db: db, table: 'tagentity_tasks__task_tags' }),
    TagEntity: dao({ db: db, table: 'tagentity' }),
    Volunteer: dao({ db: db, table: 'volunteer' }),
    Comment: dao({ db: db, table: 'comment' }),
    Community: dao({ db: db, table: 'community' }),
    CommunityUser: dao({ db: db, table: 'community_user' }),
    Cycle: dao({ db: db, table: 'cycle' }),
    CommunityEmailTemplate: dao({ db: db, table: 'community_email_template' }),
    LanguageSkill:dao({ db: db, table: 'language_skill' }),
    Country:dao({ db: db, table: 'country' }),
    CountrySubdivision: dao({ db: db, table: 'country_subdivision' }),
    LookupCode:dao({ db: db, table: 'lookup_code' }),
    Office:dao({ db: db, table: 'office' }),
    Bureau:dao({ db: db, table: 'bureau' }),
    TaskShare:dao({ db: db, table: 'task_share'}),
    SavedTask: dao({ db: db, table: 'saved_task' }),
    Application: dao({db:db,table:'application'}),
    Phase: dao({ db: db, table: 'phase' }),
    TaskListApplication:dao({ db: db, table:'task_list_application' }),
    PayPlan: dao({ db: db, table:'pay_plan' }),
    query: {
      applicationTasks:applicationTaskQuery,
      comments: commentsQuery,
      communityUserQuery: communityUserQuery,
      communityAdminsQuery: communityAdminsQuery,
      communityBureauAdminsQuery: communityBureauAdminsQuery,
      communitiesQuery: communitiesQuery,
      usdosSupportEmailQuery: usdosSupportEmailQuery,
      communityTaskQuery:communityTaskQuery,
      completedInternsQuery:completedInternsQuery,
      countrySubdivision:countrySubdivisionQuery,
      deleteTaskTags: deleteTaskTags,
      languageList:languageListQuery,
      lookUpVanityURLQuery: lookUpVanityURLQuery,
      intern:countryQuery,   
      userTasks: userTasksQuery,
      savedTask: savedTaskQuery,
      task: taskQuery,
      tasksDueQuery: tasksDueQuery,
      tasksDueDetailQuery: tasksDueDetailQuery,
      taskCommunitiesQuery:taskCommunitiesQuery,
      user: userQuery,
      volunteer: volunteerQuery,
      volunteerListQuery: volunteerListQuery,      
    },
    options: options,
    clean: clean,
  };
};
