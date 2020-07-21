import mock from './mock';

const API = '/moove/metrics';

const CIRCLES_API = '/moove/v2/circles';

const DEPLOYMENTS_API = '/moove/v2/deployments';

const findCircleMetrics = {
  method: 'GET',
  path: `${API}/circle/{circleId}/components'`,
  handler: (req, h) => h.response(mock.circlesMetrics)
};

const findDeployMetrics = {
  method: 'GET',
  path: `${API}/deployments`,
  handler: (req, h) => h.response(mock.deployMetrics())
};

const findAllCirclesMetrics = {
  method: 'GET',
  path: `${API}/circles`,
  handler: (req, h) => h.response(mock.circlesMetricsDashboard)
};

const findAllCirclsMetrics = {
  method: 'GET',
  path: `${CIRCLES_API}/history`,
  handler: async (req, h) => h.response(mock.circlesHistory)
};

const findAllCirclsReleases = {
  method: 'GET',
  path: `${DEPLOYMENTS_API}/history`,
  handler: async (req, h) => h.response(mock.allCircleReleases)
};

export default {
  findCircleMetrics,
  findDeployMetrics,
  findAllCirclsMetrics,
  findAllCirclsReleases,
  findAllCirclesMetrics
};
