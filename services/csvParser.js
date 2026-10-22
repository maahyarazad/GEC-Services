const { Parser } = require('json2csv');
/**
 * Exports an array of objects (rows) to a CSV string.
 *
 * @param {Array} rows - Array of objects to be exported as CSV.
 * @param {Object} [options] - Passed through to json2csv (e.g. fields, withBOM, delimiter, eol).
 *   When `fields` is given, an empty `rows` array yields the header row only.
 * @returns {Promise<string>} - Resolves with the generated CSV string.
 */
const exportTableAsCSV = (rows, options = {}) => {
  return new Promise((resolve, reject) => {
    const hasRows = Array.isArray(rows) && rows.length > 0;
    if (!hasRows && !options.fields) {
      return reject('No data available to export.');
    }

    try {
      const parser = new Parser(options);
      const csv = parser.parse(hasRows ? rows : []);

      resolve(csv);
    } catch (parseErr) {
      reject('CSV generation failed.');
    }
  });
};

module.exports = {
  exportTableAsCSV,
};
