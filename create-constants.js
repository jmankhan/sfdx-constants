 /*
TODO: 
- -merge with existing files (read and parse existing file) -- no longer doing this
-- ignore specified <sobject.fields> -- done
create a default preset
preserve parts of file between rewrites
write unit tests
*/

const {promisify} = require('util');
const fs = require('fs');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const exec = promisify(require('child_process').exec);

function readArgs(cliArgs) {
	return new Promise((resolve, reject) => {
		const args = {};
		for(let i=0; i<cliArgs.length; i++) {
			const arg = cliArgs[i];
			try {
				if(!arg.startsWith('-')) continue;

				if(arg === '-d' || arg === '--dir') {
					args['dir'] = cliArgs[++i];
				} else if(arg === '-h' || arg === '--help') {
					args['help'] = true;
				} else if(arg === '-n' || arg === '--name') {
					args['name'] = cliArgs[++i];
				} else if(arg === '-wp' || arg === '--with-packages') {
					args['with-packages'] = true;
				} else if(arg === '-p' || arg === '--picklists') {
					args['picklists'] = cliArgs[++i];
				} else if(arg === '-r' || arg === '--recordtypes')  {
					args['recordtypes'] = true;
				} else if(arg === '-m' || arg === '--merge') {
					args['merge'] = true;
				} else if(arg === '-ws' || arg === '--with-standard') {
					args['with-standard'] = true;
				} else {
					throw new Error('Unknown flag ' + arg);
				}
			} catch(e) {
				reject(e);
			}
		}
		
		resolve(args);
	})
}

async function main(args) {
	const json = {};
	if(args['picklists']) {
		json['picklists'] = await getPicklistValues(args);	
	}

	if(args['recordtypes']) {
		json['recordtypes'] = await getRecordTypes(args);
	}
	
	return {args, json};
}


async function output({args, json}) {
	filteredJson = await applyIgnore(json);
	const picklists = formatPicklistValues(args, filteredJson['picklists']);
	const recordtypes = formatRecordTypes(args, filteredJson['recordtypes']);

	const className = args['name'] || 'Constants';
	let output = `public class ${className} {\n`;
	output += recordtypes;
	output += picklists;
	output += '}';

	let dir = args['dir'] || 'force-app/main/default/classes/';
	if(!dir.endsWith('/')) dir += '/';

	const metaTemplate = 'sfdx-constants.template.cls-meta.xml';
	const formattedFilename = dir + className + '.cls';
	const formattedMetaFilename = dir + className + '.cls-meta.xml';

	if(args['merge'] && fs.existsSync(formattedFilename)) {
		const original = readFileAsync(formattedFilename, {encoding: 'utf-8'});
		output = merge(original, output);
	}
	await writeFileAsync(formattedFilename, output, 'utf-8');

	const metaContents = await readFileAsync(metaTemplate, {encoding: 'utf-8'});
	const sfdxProject = await readFileAsync('sfdx-project.json', {encoding: 'utf-8'});
	const meta = metaContents.replace('<sfdx-version>', JSON.parse(sfdxProject).sourceApiVersion).replace('<sfdx-fqn>', className);

	writeFileAsync(formattedMetaFilename, meta, 'utf-8');
}

async function getRecordTypes(args) {
	var recordTypeCommand = 'sfdx force:data:soql:query -q "SELECT SObjectType, Id, DeveloperName, Name FROM RecordType ORDER BY SObjectType ASC"';
	const {err, stdout, stderr} = await exec(recordTypeCommand);
	if(err) throw err;
	const result = {};
	const arr = stdout.split('\n');
	for(let i=2; i<arr.length-2; i++) {
		const row = arr[i].split(/\s+/);
		const sobjecttype = row[0];
		const id = row[1];
		const devname = row[2];
		const name = row.slice(3).reduce( (a, e) => a + ' ' + e);

		const meta = {
			'Id': id,
			'DeveloperName': devname,
			'Name': name
		};
		result[sobjecttype] = result[sobjecttype] ? result[sobjecttype] : []; 
		result[sobjecttype].push(meta);
	}
	return result;
}

//formats recordtypes in a syntactically correct screaming snake case style as such:
//public static final String SOBJECT_RECORDTYPE_DEVELOPERNAME = ID;\n
//where SOBJECT = the sobject type (e.g. Account)
//RECORDTYPE = simply the word recordtype to denote a distinction from a picklist value
//DEVELOPERNAME = the developername of the recordtype (e.g. Person Account)
//ID = the id of the recordtype
//note the --with-packages flag includes recordtypes from a package that may be installed in the org
//packages are ignored by default
function formatRecordTypes(args, json) {
	if(!json) return '';

	const withPackages = args['with-packages'] == true;
	let declaration = '';
	let output = '\n\tstatic {\n';

	Object.keys(json).filter(type => {
		return withPackages || !(type && type.match(/__/g) && type.match(/__/g).length > 1);
	})
	.sort()
	.forEach(sobjecttype => {
		output += `\t\t/* ${sobjecttype} RecordTypes */\n`;
		const meta = json[sobjecttype]
		.sort()
		.forEach(record => {
			const s = sobjecttype.toUpperCase().replace('__C', '');
			const r = 'RECORDTYPE';
			const d = record['DeveloperName'].toUpperCase().replace('__C', '');
			const n = record['Name'];
			const i = record['Id'];

			declaration += `\tpublic static String ${s}_${r}_${d};\n`;
			output += `\t\t${s}_${r}_${d} = getObjectRecordTypeMap(\'${s}\').get(\'${n}\').RecordTypeId;\n`;
		})
		output += '\n';
	})

	output += '\t}\n';
	output += '\tpublic static Map<String,Schema.RecordTypeInfo> getObjectRecordTypeMap(String objectName) {\n' +
    	'\t\treturn Schema.getGlobalDescribe().get(objectName).getDescribe().getRecordTypeInfosByName();\n' +
		'\t}\n';

	return declaration + output;
}

async function getPicklistValues(args) {
	const filename = 'queryPicklistValues.apex';
	const formattedFilename = 'queryPicklistValues.temp.apex';
	const withStandard = args['with-standard'] ? 'true' : 'false';

	const sobjects = args['picklists'].split(',');
	sobjects.forEach((s,i) => {
		sobjects[i] = s.charAt(0) == '\'' && s.charAt(s.length-1) == '\'' ? 
			s :
			'\'' + s + '\'';
	});

	//populate which sobjects to retrieve fields for
	const contents = await readFileAsync(filename, {encoding: 'utf-8'});
	const result = contents.replace(/<sobjects>/g, sobjects).replace(/<standardFields>/g, withStandard);
	
	await writeFileAsync(formattedFilename, result, 'utf-8')

	const picklistCommand = `sfdx force:apex:execute -f ${formattedFilename}`;
	const {execErr, stdout, stderr} = await exec(picklistCommand, {maxBuffer: Infinity});
	if(execErr) throw execErr;
	const r = new RegExp(/USER_DEBUG\|.*?\|DEBUG\|(.*)/g);
	const str = r.exec(stdout)[1];
	return JSON.parse(str);
}

//formats picklist value to appear in a syntactically correct screaming snake case style as such:
//public static final String SOBJECT_FIELD_LABEL = VALUE;\n
//where SOBJECT = the sobjjecttype (e.g. Account)
//FIELD = the field label (e.g. Salutation)
//LABEL = the label of the picklist value (e.g. Mr, note that special characters are stripped)
//VALUE = the api name of the picklist value (e.g. Mr.)
function formatPicklistValues(args, json) {
	if(!json) {
		return '';
	}
	let output = '';

	Object.keys(json).forEach(typeKey => {
		output += `\t/* ${typeKey} /*\n`;
		Object.keys(json[typeKey]).forEach(fieldKey => {
			output += `\t/* ${fieldKey} Picklist Values */\n`;
			json[typeKey][fieldKey].forEach(picklist => {
				const s = typeKey.toUpperCase().replace('__C', '');
				const f = fieldKey.toUpperCase().replace('__C', '');
				const l = picklist['label'].toUpperCase().replace(' ', '_').replace(/\W/g, '').replace('__C', '');
				const v = picklist['value'];

				output += `\tpublic static final String ${s}_${f}_${l} = \'${v}\';\n`;
			})
			output += '\n';
		})
	})
	return output;
}

function picklistValuesToJson(str) {
	let sobject;
	let result = {};
	try {
		sobject = JSON.parse(str)
	} catch(err) {
		throw err;
	}

	Object.keys(sobject).forEach(typeKey => {
		let type = sobject[typeKey];
		if(!result[typeKey]) result[typeKey] = {};

		Object.keys(type).forEach(fieldKey => {
			if(!result[typeKey][fieldKey]) result[typeKey][fieldKey] = [];

			 type[fieldKey].forEach(val => {
			 	if(val.active) {
			 		//remove non-alphanumeric characers and cover to screaming snake case
					const label = val.label.replace(' ', '_').replace(/\W/g, '');
					result[typeKey][fieldKey].push({Label: label, Value: val.value});
			 	}
			 });
		});
	});

	return result;
}

//merge goals:
//preserve and prefer original values
//be resilient against malformed data. preserve original state in this case
//be thread safe
//be flexibile in interpretation of duplicates, sort order, and merge location
//provide functional, actionable, and clear error messages
//expects two json objects to merge together
function merge(original, updated) {
	//validation
	if(!updated) {
		throw Error('Found no changes to merge');
	}

	//preserves original 
	return Object.assign(updated, original);
}

/*
 * expects the contents of an apex class file
 * converts this string to a json representation that is easy to manipulate
 * e.g. converts:
 * public static final String ACCOUNT_RECORDTYPE_PERSON_ACCOUNT = 'a00xx';
 * to
 * {
	Account: {
		picklists: {
			salutation: {
				MR: 'Mr.',
				MRS: 'Mrs.',
				DR: 'Dr'
			},

		},
		recordType: {
			Person_Account: 'a00xx'
		}
	}
 } 
*/
function apexToJson(apex) {
	const reg = new RegExp(/(\w+)\s+=\s+'(\w+)';/, 'gm');
	if(!reg.test(apex)) throw Error('Malformed apex found, could not find any variable definitions: ' + apex);

	const result = {};
	let group;
	while( (group = reg.exec(apex)) !== null) {
		//the variable declaration describes the constant we are looking at
		//it may be a recordtype OR a picklist field
		const variable = group[1];

		//value is the recordtype id OR the picklist api value
		const value = group[2];

		//extract info from variable
		//variableMeta[0] = sobject
		//variableMeta[1] = recordtype OR field
		//variableMeta[2] = developername OR value label
		const variableMeta = variable.split('_');

		//handle recordtype constant
		if(variableMeta[1] === 'RECORDTYPE') {
			let meta = result[variableMeta[0]] || [];
			const recordtype = {
				DeveloperName: variableMeta[2],
				Id: value
			};
			meta.push(recordtype);
			result[variableMeta[0]] = meta;
		} else {
			//handle picklist constant
			let meta = result[variableMeta[0]] || {};
			const picklist = {
				Label: variableMeta[2],
				Value: value
			};
			meta[variableMeta[1]] = picklist;
			result[variableMeta[0]] = meta;
		}
	}

	return result;
}

//converts a json object to a formatted apex-compliant string
//this will output a line delimited collection of constant variable definitions of type String
//note that the wrapper 'class' will need to be handled outside this utility function
//expects a format like so:
//{
//	sobjecttype: {
//		picklists: {Field: [{Label:Value}, {Label:Value}]},
//		recordtypes: [{DeveloperName: Id}, {DeveloperName: Id}]	
//	},
//  ...
//}
function jsonToApex(json) {
	let output = '';
	Object.keys(json).forEach(sobjecttype => {
		const picklists = json[sobjecttype]['picklists'] || {};
		const recordtypes = json[sobjecttype]['recordtypes'] || {};

		//handle picklists
		Object.keys(picklists).forEach(fieldKey => {
			picklists[fieldKey].forEach(picklist => {
					const s = sobjecttype.toUpperCase();
					const f = fieldKey.toUpperCase();
					const l = picklist.Label.toUpperCase().replace(' ', '_').replace(/\W/g, '');;
					const v = picklist.Value;

					output += `public static final String ${s}_${f}_${l} = \'${v}\';\n`;
				})
		});

		//handle recordtype
		Object.keys(recordtypes).forEach(recordtype => {
			const s = sobjecttype.toUpperCase;
			const r = 'RECORDTYPE';
			const d = recordtype.DeveloperName.toUpperCase();

			output += `public static final String ${s}_${r}_${d} = \'${recordtype.Id}\';\n`;
		})
	})

	return output;
}

async function applyIgnore(json) {
	const filename = '.sfdx-constants-ignore';
	if(!fs.existsSync(filename)) {
		return Object.assign({}, json);
	}
	const ignoreList = await readFileAsync(filename, {encoding: 'utf-8'});

	const clone = Object.assign({}, json);
	ignoreList.split('\n').forEach(line => {
		const sobject = line.split('.')[0];
		let field = line.split('.')[1];

		if(clone['recordtypes'].hasOwnProperty(sobject)) {
			clone['recordtypes'][sobject] = clone['recordtypes'][sobject].filter(recordtype => recordtype.DeveloperName.toUpperCase() !== field.toUpperCase())
		}

		if(clone['picklists'].hasOwnProperty(sobject)) {
			if(clone['picklists'][sobject].hasOwnProperty(field.trim().toLowerCase())) {
				delete clone['picklists'][sobject][field.trim().toLowerCase()];
			}
		}
	})

	return clone;
}

exports = {
	readArgs,
	main,
	output
}

if(process.env.NODE_ENV === 'test') {
	Object.assign(exports, {
		getRecordTypes,
		getPicklistValues,
		formatRecordTypes,
		formatPicklistValues,
		jsonToApex,
		apexToJson,
		picklistValuesToJson,
		merge
	});
}

module.exports = exports;