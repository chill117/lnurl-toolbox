const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
	console.log(`Usage: SCRIPT <inputFile> <outputFile>`);
	process.exit(1);
}

const _ = require('underscore');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const inputFilePath = path.resolve(inputFile);
const outputFilePath = path.resolve(outputFile);

const compiledHtml = (function() {
	const html = fs.readFileSync(inputFilePath).toString();
	const template = Handlebars.compile(html);
	const data = _.extend({}, pkg);
	return template(data);
})();

fs.writeFileSync(outputFilePath, compiledHtml);
console.log(`Compiled ${outputFile} from template`);
