# SFDX-Constants

### Description
SFDX Constants is a cli utility to help with code generation of Apex constants. It leverages [sfdx-cli](https://developer.salesforce.com/tools/sfdxcli) to gather metadata about a scratch org and generate a Constants class.

### Installation
Run `npm install sfdx-constants` to install from npm registry

### Usage
|Flag|Description|
|-----|-----|
|`-p --picklists <SObject,SObject>`|Generates picklist constants for one or more SObjects|
|`-r --recordtypes`|Generates Recordtypes for all non-packaged recordtypes present in orgs|
|`-d --dir <path>`|List the path of the output directory, defaults to _force-app/main/default/classes/_|
|`-wp --with-packages`|Includes package recordtypes when generating recordtypes|
|`-n --name <string>`|The output file and class name. Defaults to _Constants_|
|`-h --help`|Help menu|
|`-m --merge <filename>`|Merges the output with an existing file. Useful for existing projects or minimizing many line changes|

### Requirements
Since this tool relies on sfdx the [sfdx-cli](https://developer.salesforce.com/tools/sfdxcli) tool is required to be installed. It is recommended that the script be run for development only and the output be checked into version control. There are no other dependencies required to run the tool.

### Sane defaults
If no arguments are provided, the tool will run in 'sane default' mode, which will make assumptions about common coding patterns. It will generate all recordtypes, custom object picklist values, and custom picklist values on standard objects. 