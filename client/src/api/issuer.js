
import { connectFleetAPIAsDeveloperOnce, FILTERS_PRESETS } from '../common/fleetAPI/fleetAPI';
import _ from 'lodash';
import { cacheFunc } from '../common/cache';


const Issuer = {};

Issuer.all = async function () {
  const api = await connectFleetAPIAsDeveloperOnce();
  return api.get('/issuer');
};

Issuer.allCached = _.once(cacheFunc(Issuer.all));

Issuer.allById = async function () {
  const issuers = await this.allCached();
  return _.keyBy(issuers, 'issuerId');
};

Issuer.allByIdCached = _.once(Issuer.allById);

Issuer.allByName = async function () {
  const issuers = await this.allCached();
  return _.keyBy(issuers, 'name');
};

Issuer.allByNameCached = _.once(Issuer.allByName);

Issuer.find = async function (issuerId) {
  return await Issuer.findBy({ issuerId });
};

Issuer.findBy = async function (filter) {
  const all = await Issuer.allCached();
  return _.find(all, filter);
};

Issuer.findByIssuerId = async function (filter) {
  const issuer = await Issuer.findBy(filter);
  return issuer.issuerId;
};

// ✅ CHANGED: module.exports → export
export { Issuer };
