const rewire = require('rewire');
const fs = require('fs');
const expect = require('chai').expect;
const lib = require('../create-constants.js');


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

	it('reads the ignore flags', async () => {
		let args = ['-i', 'Account.Salutation'];
		let args2 = ['--ignore', 'Account.Salutation'];
		let result = await Promise.all([lib.readArgs(args), lib.readArgs(args2)]);

		expect(result[0]).to.eql(result[1]).and.to.eql({ignore: 'Account.Salutation'});
	})
})