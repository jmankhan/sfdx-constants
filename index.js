const lib = require('./create-constants');

lib.readArgs(process.argv)
	.then(lib.main)
	.then((args, result) => lib.output(args, result))
	.catch(err => console.log(err));
