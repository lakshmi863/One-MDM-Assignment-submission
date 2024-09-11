export default (app) => {
  app.post(`/tenant/:tenantId/assignment`, async (req, res, next) => {
    try {
      await require('./assignmentCreate').default(req, res);
    } catch (error) {
      next(error);
    }
  });

  app.put(`/tenant/:tenantId/assignment/:id`, async (req, res, next) => {
    try {
      await require('./assignmentUpdate').default(req, res);
    } catch (error) {
      next(error);
    }
  });

  app.post(`/tenant/:tenantId/assignment/import`, async (req, res, next) => {
    try {
      await require('./assignmentImport').default(req, res);
    } catch (error) {
      next(error);
    }
  });

  app.delete(`/tenant/:tenantId/assignment`, async (req, res, next) => {
    try {
      await require('./assignmentDestroy').default(req, res);
    } catch (error) {
      next(error);
    }
  });

  app.get(`/tenant/:tenantId/assignment/autocomplete`, async (req, res, next) => {
    try {
      await require('./assignmentAutocomplete').default(req, res);
    } catch (error) {
      next(error);
    }
  });

  app.get(`/tenant/:tenantId/assignment`, async (req, res, next) => {
    try {
      await require('./assignmentList').default(req, res);
    } catch (error) {
      next(error);
    }
  });

  app.get(`/tenant/:tenantId/assignment/:id`, async (req, res, next) => {
    try {
      await require('./assignmentFind').default(req, res);
    } catch (error) {
      next(error);
    }
  });
};
