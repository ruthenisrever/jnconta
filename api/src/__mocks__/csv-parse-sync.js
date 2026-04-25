// Jest mock for csv-parse/sync
// The StatementParserService uses require('csv-parse/sync').parse
// This mock re-exports the real module from node_modules

const csvParseSync = require('csv-parse/sync');
module.exports = csvParseSync;
