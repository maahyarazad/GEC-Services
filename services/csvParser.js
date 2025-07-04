const { Parser } = require('json2csv');
/**
 * Exports an array of objects (rows) to a CSV file.
 *
 * @param {Array} rows - Array of objects to be exported as CSV.
 * @returns {Promise<string>} - Resolves with the file path to the generated CSV.
 */
const exportTableAsCSV = (rows) => {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return reject('No data available to export.');
    }

    try {
      const parser = new Parser();
      const csv = parser.parse(rows);

      resolve(csv);
    } catch (parseErr) {
      reject('CSV generation failed.');
    }
  });
};

module.exports = {
  exportTableAsCSV,
};
