#! /usr/bin/env node
const path = require('path');
const lib = require(path.resolve(__dirname, './create-constants'));

lib.readArgs(process.argv)
	.then(lib.main)
	.then((args, result) => lib.output(args, result))
	.catch(err => console.log(err));
