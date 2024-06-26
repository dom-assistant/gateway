const { RateLimiterRedis } = require('rate-limiter-flexible');

const { ForbiddenError, TooManyRequestsError } = require('../common/error');
const asyncMiddleware = require('./asyncMiddleware');

const MAX_REQUESTS = parseInt(process.env.OPEN_AI_MAX_REQUESTS_PER_MONTH_PER_ACCOUNT, 10);

module.exports = function OpenAIAuthAndRateLimit(logger, redisClient, db) {
  const limiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rate_limit:open_ai',
    points: MAX_REQUESTS, // max request per month
    duration: 30 * 24 * 60 * 60, // 30 days
  });
  return asyncMiddleware(async (req, res, next) => {
    const instanceWithAccount = await db.t_account
      .join({
        t_instance: {
          type: 'INNER',
          on: {
            account_id: 'id',
          },
        },
      })
      .findOne({
        't_instance.id': req.instance.id,
      });
    if (instanceWithAccount.status !== 'active') {
      throw new ForbiddenError('Account license should be active');
    }
    const uniqueIdentifier = instanceWithAccount.id;
    // we check if the current account is rate limited
    const limiterResult = await limiter.get(uniqueIdentifier);
    if (limiterResult && limiterResult.consumedPoints > MAX_REQUESTS) {
      logger.warn(`OpenAI Rate limit: Account ${uniqueIdentifier} has been querying too much this route`);
      throw new TooManyRequestsError('Too many requests this month.');
    }

    // We consume one credit
    try {
      await limiter.consume(uniqueIdentifier);
    } catch (e) {
      logger.warn(`OpenAI Rate limit: Account ${uniqueIdentifier} has been querying too much this route`);
      logger.warn(e);
      throw new TooManyRequestsError('Too many requests this month.');
    }

    next();
  });
};
