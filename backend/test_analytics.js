const analytics = require('./src/modules/analytics/analytics.service');

async function test() {
    try {
        const summary = await analytics.getSummary();
        console.log('SUMMARY:', Object.keys(summary));
    } catch (e) { console.error('SUMMARY ERROR:', e.message); }

    try {
        const dist = await analytics.getRiskDistribution();
        console.log('DIST:', dist);
    } catch (e) { console.error('DIST ERROR:', e.message); }

    try {
        const trends = await analytics.getTrends();
        console.log('TRENDS:', trends);
    } catch (e) { console.error('TRENDS ERROR:', e.message); }

    try {
        const shippers = await analytics.getTopRiskyShippers({ type: 'importer', limit: 5 });
        console.log('SHIPPERS:', shippers);
    } catch (e) { console.error('SHIPPERS ERROR:', e.message); }

    try {
        const country = await analytics.getCountryRisk();
        console.log('COUNTRY:', country);
    } catch (e) { console.error('COUNTRY ERROR:', e.message); }

    process.exit(0);
}

test();
