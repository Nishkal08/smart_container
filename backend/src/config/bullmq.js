const { Queue } = require('bullmq');
const { createBullMQConnection } = require('./redis');

const PREDICTION_QUEUE_NAME = 'prediction_queue';

let predictionQueue = null;

function getPredictionQueue() {
  if (!predictionQueue) {
    predictionQueue = new Queue(PREDICTION_QUEUE_NAME, {
      connection: createBullMQConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 1000 }, // Keep last 1000 completed jobs in Redis
        removeOnFail: { count: 500 },
      },
    });
  }
  return predictionQueue;
}

module.exports = { getPredictionQueue, PREDICTION_QUEUE_NAME };
