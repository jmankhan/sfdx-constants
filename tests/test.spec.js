 /*
 THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. 
 IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, 
 WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
process.env.NODE_ENV = 'test';

const rewire = require('rewire');
const sinon = require('sinon');
const expect = require('chai').expect;
const lib = rewire('../create-constants.js');
const fs = require('fs');

afterEach(() => {
	sinon.restore();
})

describe('test readArgs function', () => {
	it('reads the dir flags', async () => {
		let args = ['-d', 'foo/bar/baz'];
		let args2 = ['--dir', 'foo/bar/baz'];
		let result = await Promise.all([lib.readArgs(args), lib.readArgs(args2)]);

		expect(result[0]).to.eql(result[1]).and.to.eql({dir: 'foo/bar/baz'});
	})

	it('reads the help flags', async () => {
		let args = ['-h'];
		let args2 = ['--help'];
		let result = await Promise.all([lib.readArgs(args), lib.readArgs(args2)]);

		expect(result[0]).to.eql(result[1]).and.to.eql({help: true});
	})

	it('reads the name flags', async () => {
		let args = ['-n', 'foo/bar/baz'];
		let args2 = ['--name', 'foo/bar/baz'];
		let result = await Promise.all([lib.readArgs(args), lib.readArgs(args2)]);

		expect(result[0]).to.eql(result[1]).and.to.eql({name: 'foo/bar/baz'});
	})

	it('reads the with-packages flags', async () => {
		let args = ['-wp', 'foo/bar/baz'];
		let args2 = ['--with-packages', 'foo/bar/baz'];
		let result = await Promise.all([lib.readArgs(args), lib.readArgs(args2)]);

		expect(result[0]).to.eql(result[1]).and.to.eql({'with-packages': true});
	})

	it('reads the picklist flags', async () => {
		let args = ['-p', 'foo,bar,baz'];
		let args2 = ['--picklists', 'foo,bar,baz'];
		let result = await Promise.all([lib.readArgs(args), lib.readArgs(args2)]);

		expect(result[0]).to.eql(result[1]).and.to.eql({picklists: 'foo,bar,baz'});

		//test single arg
		args = ['-p', 'foo'];
		result = await lib.readArgs(args);
		expect(result).to.eql({picklists: 'foo'});

		//test special characters
		args = ['-p', 'foo.bar!'];
		result = await lib.readArgs(args);
		expect(result).to.eql({picklists: 'foo.bar!'})
	})

	it('reads the recordtypes flags', async () => {
		let args = ['-r'];
		let args2 = ['--recordtypes'];
		let result = await Promise.all([lib.readArgs(args), lib.readArgs(args2)]);

		expect(result[0]).to.eql(result[1]).and.to.eql({recordtypes: true});
	})

})

describe('test getRecordTypes function', () => {
	beforeEach(done => {
		const stdout = 
		'SObjectType                      Id DeveloperName     Name\n' +
		'-------------------------------- -- ----------------- ----\n' +
		'Account                          a  PersonAccount     name1\n' +
		'Account                          b  Business_Account  name2\n' +
		'Product2                         c  Promotion         name3\n' +
		'Product2                         d  Other             name4\n' +
		'Total number of records retrieved: 4.\n';
		const output = {err: null, stderr: null, stdout: stdout};
		lib.__set__('exec', cmd => output);
		done();
	})

	it('should return a formed json object', async () => {
		const result = await lib.getRecordTypes(null);
		expect(result).to.be.an('object');
	})

	it('should return a json object with correct attributes', async () => {
		const result = await lib.getRecordTypes(null);
		expect(result).to.have.all.keys(['Account', 'Product2'])
	})

	it('should return a json object with correct values', async () => {
		const result = await lib.getRecordTypes(null);
		expect(result).to.eql({
			Account: [{Id: 'a', DeveloperName: 'PersonAccount', Name: 'name1'}, {Id: 'b', DeveloperName: 'Business_Account', Name: 'name2'}],
			Product2: [{Id: 'c', DeveloperName: 'Promotion', Name: 'name3'}, {Id: 'd', DeveloperName: 'Other', Name: 'name4'}]
		});
	})
})

describe('test getPicklistValues function', () => {
	const args = {picklists: 'Account'};

	beforeEach(done => {
		const stdout = fs.readFileSync('./tests/getPicklistValues.txt', 'utf-8');
		const queryFile = fs.readFileSync('./tests/queryPicklistValues.apex', 'utf-8');
		const output = {execErr: null, stdout: stdout, stderr: null};

		lib.__set__('readFileAsync', (filename, options) => queryFile);
		lib.__set__('exec', cmd => output);
		
		done();
	})

	it('should return a formed json object', async () => {
		const result = await lib.getPicklistValues(args);
		expect(result).to.be.an('object');
	})

	it('should return a json object with correct attributes', async () => {
		const result = await lib.getPicklistValues(args)
		expect(result).to.have.all.keys(['Account'])
		expect(result['Account']).to.have.all.keys(['picklist_field'])
	})

	it('should return a json object with correct values', async () => {
		const result = await lib.getPicklistValues(args);
		expect(result).to.eql({
			Account: {
				picklist_field: [{value: 'v1', label: 'l1'}, {value: 'v2', label: 'l2'}]
			}
		})
	})
})

describe('test formatRecordTypes function', () => {
	const json = {Account: [{Id: 'a', DeveloperName: 'PersonAccount', Name: 'Person Account'}]};

	it('should return a blank string if the json input is null or blank', () => {
		const result = lib.formatRecordTypes(null, null);
		expect(result).to.be.a.string;
		expect(result).to.equal('');
	})

	it('should create a single line output for one field in an sobjecttype', () => {
		const result = lib.formatRecordTypes({}, json);
		expect(result).to.include('public static String ACCOUNT_RECORDTYPE_PERSONACCOUNT;')
		expect(result).to.include('ACCOUNT_RECORDTYPE_PERSONACCOUNT = getObjectRecordTypeMap(\'ACCOUNT\').get(\'Person Account\').RecordTypeId;')
	})

	it('should create a helper function with an apex statement', () => {
		const result = lib.formatRecordTypes({}, json);
		expect(result).to.include('Schema.getGlobalDescribe().get(objectName).getDescribe().getRecordTypeInfosByName();');
	})
})

describe('test formatPicklistValues function', () => {
	const json = {Account: {Salutation: [{label: 'Mr.', value: 'MR'}, {label: 'Mrs.', value: 'MRS'}]}, Contact: {Salutation: [{label: 'Mr.', value: 'MR'}]}};

	it('should return a blank string if the json input is null or blank', () => {
		const result = lib.formatPicklistValues(null, null);
		expect(result).to.be.a.string
		expect(result).to.equal('')	
	})

	it('should create a single variable declaration for each input', () => {
		const result = lib.formatPicklistValues({}, json);
		expect(result).to.include('public static final String ACCOUNT_SALUTATION_MR = \'MR\';');
		expect(result).to.include('public static final String ACCOUNT_SALUTATION_MRS = \'MRS\';');
		expect(result).to.include('public static final String CONTACT_SALUTATION_MR = \'MR\';');
	})
})

describe('test applyIgnore function', () => {

})