const Router = require('koa-router');
const auth = require('../../auth/auth');
const service = require('./service');
const cycleService = require('../../cycle/service');
var _ = require('lodash');

var router = new Router();
var Handler = {};

router.get('/api/v1/cycle/getPhaseData', auth.bearer, async (ctx, next) => {
  var data = await service.getPhaseData(ctx.state.user.id, ctx.query.cycleID);
  ctx.body = data;
});

router.post('/api/v1/cycle/beginPhase', auth.bearer, async (ctx, next) => {
  var isManager = await service.checkIsManager(ctx.state.user.id, ctx.request.fields.cycleId);
  if (!isManager) {
    ctx.status = 403;
    ctx.body = { message: 'Forbidden' };
    return false;
  }

  if (ctx.request.fields.action == 'closeCycle') {
    if (!await service.checkIsJOACreated(ctx.request.fields.cycleId)) {
      ctx.status = 403;
      ctx.body = { message: 'Exclusive job not created.' };
      return false;
    }
  }

  Handler[ctx.request.fields.action](ctx).then(async results => {
    service.createAuditLog('PHASE_STARTED', ctx, {
      cycleId: ctx.request.fields.cycleId,
      results: results,
    });    


  }).catch(err => {    
    ctx.status = 403;
    ctx.body = { message: err };
    service.recordError(ctx.state.user.id, err);
    return false;
  });

  ctx.status = 202;
  ctx.body = { message: 'Acknowledged' };
});

Handler.startPrimaryPhase = async function (ctx) {
  await service.startPhaseProcessing(ctx.request.fields.cycleId);
  return new Promise((resolve, reject) => {
    drawMany(ctx).then(results => {
      service.sendPrimaryPhaseStartedCommunityNotification(ctx.request.fields.cycleId);
      service.sendPrimaryPhaseStartedNotification(ctx.state.user, true);
      resolve(results);
    }).catch(err => {
      service.sendPrimaryPhaseStartedNotification(ctx.state.user, false);
      reject(err);
    });
  });
};

Handler.startAlternatePhase = async function (ctx) {
  await service.startAlternateProcessing(ctx.state.user, ctx.request.fields.cycleId);
  return new Promise((resolve, reject) => {
    drawMany(ctx).then(results => {
      service.sendAlternatePhaseStartedNotification(ctx.request.fields.cycleId);
      resolve(results);
    }).catch(err => {      
      reject(err);
    });
  });
};

Handler.closeCycle = async function (ctx) {
  await service.archivePhase(ctx.request.fields.cycleId);
};

async function drawMany (ctx) {
  return new Promise((resolve, reject) => {
    service.drawMany(ctx.state.user.id, ctx.request.fields.cycleId).then(async results => {
      var phaseId = await service.updatePhaseForCycle(ctx.request.fields.cycleId);   
      results.phaseId = phaseId;
      resolve(results);
    }).catch(err => {
      reject(err);
    });
  });
}

// Keeping this around for right now.
router.post('/api/v1/cycle/drawMany', auth.bearer, async (ctx, next) => {
  await service.drawMany(ctx.state.user.id, ctx.request.fields.cycleId).then(async results => {
    await service.updatePhaseForCycle(ctx.request.fields.cycleId, ctx.request.fields.phaseId);
    ctx.status = 200;       
    ctx.body = results;
  }).catch(err => {
    ctx.status = err.status;
  });   
});

router.post('/api/v1/cycle/drawOne', auth.bearer, async (ctx, next) => {
  var data = await service.drawOne(ctx.state.user.id, ctx.request.fields.taskId);
  ctx.body = data.rows[0];
});

router.get('/api/v1/cycle/getCommunityUsers', auth.bearer, async (ctx, next) => {
  var data = await service.getCommunityUsers(ctx.query.cycleID);
  ctx.body = data;
});

router.get('/api/v1/cycle/checkProcessingStatus', auth.bearer, async (ctx, next) => {
  ctx.body = await cycleService.checkProcessingStatus(ctx.query.taskId);
});

router.get('/api/v1/cycle/checkCycleStatus', auth.bearer, async (ctx, next) => {
  ctx.body = await service.checkCycleStatus(ctx.query.cycleId);
});

router.get('/api/v1/cycle/report', auth.bearer, async (ctx, next) => {
  ctx.body = await service.downloadReport(ctx.query.cycleId);
});

module.exports = router.routes();
