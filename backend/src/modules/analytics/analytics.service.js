const prisma = require('../../config/db');

async function getSummary({ userId, isAdmin } = {}) {
  const ownerCond = (!isAdmin && userId)
    ? { OR: [{ uploaded_by: userId }, { uploaded_by: null }] }
    : {};
  const containerBase = { deleted_at: null, ...ownerCond };
  const predBase = (!isAdmin && userId)
    ? { container: { OR: [{ uploaded_by: userId }, { uploaded_by: null }] } }
    : {};

  const [
    totalContainers,
    totalPredictions,
    riskDist,
    avgRisk,
    containersToday,
    criticalToday,
    totalValueAgg,
  ] = await Promise.all([
    prisma.container.count({ where: containerBase }),
    prisma.prediction.count({ where: predBase }),
    prisma.prediction.groupBy({
      by: ['risk_level'],
      where: predBase,
      _count: { risk_level: true },
    }),
    prisma.prediction.aggregate({ where: predBase, _avg: { risk_score: true } }),
    prisma.container.count({
      where: {
        ...containerBase,
        created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.prediction.count({
      where: {
        ...predBase,
        risk_level: 'CRITICAL',
        created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.container.aggregate({
      where: containerBase,
      _sum: { declared_value: true },
    }),
  ]);

  const distribution = {};
  riskDist.forEach((r) => { distribution[r.risk_level] = r._count.risk_level; });

  return {
    total_containers: totalContainers,
    total_predictions: totalPredictions,
    total_declared_value: totalValueAgg._sum.declared_value ?? 0,
    risk_distribution: {
      CLEAR: distribution.CLEAR || 0,
      LOW_RISK: distribution.LOW_RISK || 0,
      CRITICAL: distribution.CRITICAL || 0,
    },
    avg_risk_score: Math.round((avgRisk._avg.risk_score || 0) * 10) / 10,
    containers_today: containersToday,
    critical_today: criticalToday,
  };
}

async function getRiskDistribution({ userId, isAdmin } = {}) {
  const where = (!isAdmin && userId)
    ? { container: { OR: [{ uploaded_by: userId }, { uploaded_by: null }] } }
    : {};
  const dist = await prisma.prediction.groupBy({
    by: ['risk_level'],
    where,
    _count: { risk_level: true },
    _avg: { risk_score: true },
  });
  return dist.map((d) => ({
    risk_level: d.risk_level,
    count: d._count.risk_level,
    avg_score: Math.round((d._avg.risk_score || 0) * 10) / 10,
  }));
}

async function getTrends({ period = '30d', userId, isAdmin } = {}) {
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const predWhere = { created_at: { gte: since } };
  if (!isAdmin && userId) {
    predWhere.container = { OR: [{ uploaded_by: userId }, { uploaded_by: null }] };
  }

  const predictions = await prisma.prediction.findMany({
    where: predWhere,
    select: { risk_level: true, created_at: true },
    orderBy: { created_at: 'asc' },
  });

  // Group by date
  const byDate = {};
  predictions.forEach((p) => {
    const date = p.created_at.toISOString().split('T')[0];
    if (!byDate[date]) byDate[date] = { date, CLEAR: 0, LOW_RISK: 0, CRITICAL: 0 };
    byDate[date][p.risk_level] = (byDate[date][p.risk_level] || 0) + 1;
  });

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

async function getTopRiskyShippers({ type = 'importer', limit = 10, userId, isAdmin } = {}) {
  const field = type === 'exporter' ? 'exporter_id' : 'importer_id';
  const limitInt = parseInt(limit, 10);

  if (isAdmin) {
    return prisma.$queryRawUnsafe(`
      SELECT c.${field} AS shipper_id,
             COUNT(p.id)::int AS total_shipments,
             ROUND(AVG(p.risk_score)::numeric, 1) AS avg_risk_score,
             COUNT(CASE WHEN p.risk_level = 'CRITICAL' THEN 1 END)::int AS critical_count
      FROM predictions p
      JOIN containers c ON p.container_id = c.id
      WHERE c.deleted_at IS NULL
      GROUP BY c.${field}
      ORDER BY avg_risk_score DESC, critical_count DESC
      LIMIT ${limitInt}
    `);
  }

  return prisma.$queryRawUnsafe(`
    SELECT c.${field} AS shipper_id,
           COUNT(p.id)::int AS total_shipments,
           ROUND(AVG(p.risk_score)::numeric, 1) AS avg_risk_score,
           COUNT(CASE WHEN p.risk_level = 'CRITICAL' THEN 1 END)::int AS critical_count
    FROM predictions p
    JOIN containers c ON p.container_id = c.id
    WHERE c.deleted_at IS NULL AND (c.uploaded_by = $1 OR c.uploaded_by IS NULL)
    GROUP BY c.${field}
    ORDER BY avg_risk_score DESC, critical_count DESC
    LIMIT ${limitInt}
  `, userId);
}

async function getCountryRisk({ userId, isAdmin } = {}) {
  if (isAdmin) {
    return prisma.$queryRaw`
      SELECT c.origin_country AS country,
             COUNT(p.id)::int AS total,
             ROUND(AVG(p.risk_score)::numeric, 1) AS avg_risk_score,
             COUNT(CASE WHEN p.risk_level = 'CRITICAL' THEN 1 END)::int AS critical_count,
             COUNT(CASE WHEN p.risk_level = 'LOW_RISK' THEN 1 END)::int AS low_risk_count
      FROM predictions p
      JOIN containers c ON p.container_id = c.id
      WHERE c.deleted_at IS NULL
      GROUP BY c.origin_country
      ORDER BY avg_risk_score DESC
    `;
  }
  return prisma.$queryRaw`
    SELECT c.origin_country AS country,
           COUNT(p.id)::int AS total,
           ROUND(AVG(p.risk_score)::numeric, 1) AS avg_risk_score,
           COUNT(CASE WHEN p.risk_level = 'CRITICAL' THEN 1 END)::int AS critical_count,
           COUNT(CASE WHEN p.risk_level = 'LOW_RISK' THEN 1 END)::int AS low_risk_count
    FROM predictions p
    JOIN containers c ON p.container_id = c.id
    WHERE c.deleted_at IS NULL AND (c.uploaded_by = ${userId} OR c.uploaded_by IS NULL)
    GROUP BY c.origin_country
    ORDER BY avg_risk_score DESC
  `;
}

async function getValueWeightScatter({ userId, isAdmin } = {}) {
  const where = (!isAdmin && userId)
    ? { container: { OR: [{ uploaded_by: userId }, { uploaded_by: null }] } }
    : {};
  const predictions = await prisma.prediction.findMany({
    take: 500,
    orderBy: { created_at: 'desc' },
    where,
    select: {
      risk_level: true,
      risk_score: true,
      container: {
        select: {
          container_id: true,
          declared_value: true,
          declared_weight: true,
        },
      },
    },
  });

  return predictions.map((p) => ({
    id: p.container.container_id,
    value: p.container.declared_value,
    weight: p.container.declared_weight,
    risk_level: p.risk_level,
    risk_score: Math.round(p.risk_score * 10) / 10,
  }));
}

async function getAnomalyFrequency({ userId, isAdmin } = {}) {
  const where = (!isAdmin && userId)
    ? { container: { OR: [{ uploaded_by: userId }, { uploaded_by: null }] } }
    : {};
  const predictions = await prisma.prediction.findMany({
    select: { anomalies: true },
    where,
    orderBy: { created_at: 'desc' },
    take: 5000,
  });

  const freq = {};
  predictions.forEach((p) => {
    let anomalies = p.anomalies;
    if (typeof anomalies === 'string') {
      try {
        anomalies = JSON.parse(anomalies);
      } catch (e) {
        anomalies = [];
      }
    }
    if (Array.isArray(anomalies)) {
      anomalies.forEach((a) => {
        // ML service returns anomaly objects { type, severity, description }
        // or plain strings — handle both
        const key = typeof a === 'object' && a !== null
          ? (a.type || a.anomaly_type || a.name || JSON.stringify(a)).replace(/_/g, ' ')
          : String(a);
        freq[key] = (freq[key] || 0) + 1;
      });
    }
  });

  return Object.entries(freq)
    .map(([anomaly, count]) => ({ anomaly, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

async function getTradeRoutes({ userId, isAdmin } = {}) {
  if (isAdmin) {
    return prisma.$queryRaw`
      SELECT origin_country AS origin,
             destination_country AS destination,
             COUNT(*)::int AS count
      FROM containers
      WHERE deleted_at IS NULL AND origin_country != '' AND destination_country != ''
      GROUP BY origin_country, destination_country
      ORDER BY count DESC
      LIMIT 50
    `;
  }
  return prisma.$queryRaw`
    SELECT origin_country AS origin,
           destination_country AS destination,
           COUNT(*)::int AS count
    FROM containers
    WHERE deleted_at IS NULL AND origin_country != '' AND destination_country != ''
      AND (uploaded_by = ${userId} OR uploaded_by IS NULL)
    GROUP BY origin_country, destination_country
    ORDER BY count DESC
    LIMIT 50
  `;
}

module.exports = {
  getSummary,
  getRiskDistribution,
  getTrends,
  getTopRiskyShippers,
  getCountryRisk,
  getValueWeightScatter,
  getAnomalyFrequency,
  getTradeRoutes
};
