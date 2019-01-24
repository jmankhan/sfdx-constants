# SFDX-Constants

### Description
SFDX Constants is a cli utility to help with code generation of Apex constants. It leverages [sfdx-cli](https://developer.salesforce.com/tools/sfdxcli) to gather metadata about a scratch org and generate a Constants class.

### Installation
Run `npm install sfdx-constants` to install from npm registry

### Usage
It is recommended to "link" this package from this project via npm so it can be used from the cli.

To do so, navigate to the install location, usually "./node_modules/sfdx-constants/"
then run
`npm link`.

You can then navigate back to your DX directory and use `sfdx-constants` as a cli command.

Here are the flags available to use available:
|Flag|Description|
|-----|-----|
|`-p --picklists <SObject,SObject>`|Must set this flag or the recordtypes flag, or both. Generates picklist constants for one or more SObjects|
|`-r --recordtypes`|Must set this flag or the picklists flag, or both. Generates Recordtypes for all non-packaged recordtypes present in orgs|
|`-d --dir <path>`|List the path of the output directory, defaults to _force-app/main/default/classes/_|
|`-wp --with-packages`|Includes package recordtypes when generating recordtypes|
|`-n --name <string>`|The output file and class name. Defaults to _Constants_|
|`-h --help`|Help menu|
|`-ws --with-standard`|Includes standard fields in the output. This is disabled by default, set this flag to enable it|

You may optionally include a `.sfdx-constants-ignore` with a line delimited, dot-notation string of an sobject and field to indicate any picklist values you wish to ignore.

Example:
`Account.PersonMailingStateCode`
`Account.Custom_Field__c`

### Requirements
Since this tool relies on sfdx the [sfdx-cli](https://developer.salesforce.com/tools/sfdxcli) tool is required to be installed. It is recommended that the script be run for development only and the output be checked into version control. There are no other dependencies required to run the tool.

### Sane defaults (coming soon)
If no arguments are provided, the tool will run in 'sane default' mode, which will make assumptions about common coding patterns. It will generate all recordtypes, custom object picklist values, and custom picklist values on standard objects. 