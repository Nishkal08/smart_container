const csv = require('csv-parser');
const fs = require('fs');
const { Readable } = require('stream');
const logger = require('./logger');

/**
 * Maps a raw CSV row (with original column names from the dataset)
 * to our internal container schema fields.
 */
function mapRowToContainer(row) {
  return {
    container_id: String(row['Container_ID'] || row['container_id'] || '').trim(),
    declaration_date: String(row['Declaration_Date (YYYY-MM-DD)'] || row['Declaration_Date'] || row['declaration_date'] || '').trim(),
    declaration_time: String(row['Declaration_Time'] || row['declaration_time'] || '').trim(),
    trade_regime: String(row['Trade_Regime (Import / Export / Transit)'] || row['Trade_Regime'] || row['trade_regime'] || 'Import').trim(),
    origin_country: String(row['Origin_Country'] || row['origin_country'] || '').trim(),
    destination_port: String(row['Destination_Port'] || row['destination_port'] || '').trim(),
    destination_country: String(row['Destination_Country'] || row['destination_country'] || '').trim(),
    hs_code: String(row['HS_Code'] || row['hs_code'] || '').trim(),
    importer_id: String(row['Importer_ID'] || row['importer_id'] || '').trim(),
    exporter_id: String(row['Exporter_ID'] || row['exporter_id'] || '').trim(),
    declared_value: parseFloat(row['Declared_Value'] || row['declared_value'] || 0),
    declared_weight: parseFloat(row['Declared_Weight'] || row['declared_weight'] || 0),
    measured_weight: parseFloat(row['Measured_Weight'] || row['measured_weight'] || 0),
    shipping_line: String(row['Shipping_Line'] || row['shipping_line'] || '').trim(),
    dwell_time_hours: parseFloat(row['Dwell_Time_Hours'] || row['dwell_time_hours'] || 0),
  };
}

/**
 * Parse a CSV file from a file path into an array of container objects.
 * @param {string} filePath - Absolute path to CSV file
 * @returns {Promise<{ containers: Array, errors: Array, skipped: number }>}
 */
function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const containers = [];
    const errors = [];
    let rowIndex = 0;

    fs.createReadStream(filePath)
      .pipe(csv({
        skipEmptyLines: true,
        trim: true,
      }))
      .on('data', (row) => {
        rowIndex++;
        try {
          const container = mapRowToContainer(row);

          // Basic validation
          if (!container.container_id) {
            errors.push({ row: rowIndex, reason: 'Missing Container_ID' });
            return;
          }
          if (isNaN(container.declared_weight) || container.declared_weight < 0) {
            errors.push({ row: rowIndex, container_id: container.container_id, reason: 'Invalid declared_weight' });
            return;
          }

          containers.push(container);
        } catch (err) {
          errors.push({ row: rowIndex, reason: err.message });
        }
      })
      .on('end', () => {
        logger.info('CSV parsing complete', {
          total: rowIndex,
          valid: containers.length,
          errors: errors.length,
        });
        resolve({ containers, errors, skipped: errors.length });
      })
      .on('error', (err) => {
        logger.error('CSV parse error', { error: err.message });
        reject(err);
      });
  });
}

/**
 * Convert an array of prediction objects to a CSV string.
 * This produces the submission-format output required by the problem statement.
 */
function predictionsToCSV(predictions) {
  const header = 'Container_ID,Risk_Score,Risk_Level,Explanation_Summary,Weight_Discrepancy_Pct,Value_Per_Kg,Model_Version,Created_At\n';
  const rows = predictions.map((p) => {
    const explanation = `"${(p.explanation_summary || '').replace(/"/g, '""')}"`;
    return [
      p.container?.container_id || p.container_id || '',
      p.risk_score,
      p.risk_level,
      explanation,
      p.weight_discrepancy_pct !== null ? p.weight_discrepancy_pct.toFixed(2) : '',
      p.value_per_kg !== null ? p.value_per_kg.toFixed(2) : '',
      p.model_version || '',
      p.created_at ? new Date(p.created_at).toISOString() : '',
    ].join(',');
  });
  return header + rows.join('\n');
}

module.exports = { parseCSVFile, predictionsToCSV, mapRowToContainer };
