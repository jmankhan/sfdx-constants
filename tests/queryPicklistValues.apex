//yep, this is a thing
Map<String, Map<String, List<Map<String, String>>>> result = new Map<String, Map<String, List<Map<String, String>>>>();

Map<String, SObjectType> describe = Schema.getGlobalDescribe();
List<String> objects = new List<String>{<sobjects>};
Boolean useStandardFields = <standardFields>;

for(String sobjecttype : objects) {
	Schema.DescribeSObjectResult objectDescribe = describe.get(sobjecttype).getDescribe();
	Map<String, Schema.SobjectField> fieldMap = objectDescribe.fields.getMap();
	Map<String, List<Map<String, String>>> fieldPicklistValues = new Map<String, List<Map<String, String>>>();

	for(String fieldName : fieldMap.keySet()) {
		if(fieldMap.get(fieldName).getDescribe().getType() == Schema.DisplayType.PICKLIST) {
			if(!useStandardFields && !fieldMap.get(fieldName).getDescribe().isCustom()) {
				continue;
			}
			List<Schema.PicklistEntry> picklistEntries = fieldMap.get(fieldName).getDescribe().getPicklistValues();
			List<Map<String, String>> formattedPicklistEntries = new List<Map<String, String>>();
			for(Schema.PicklistEntry entry : picklistEntries) {
				Map<String, String> formattedEntry = new Map<String, String>();
				formattedEntry.put('label', entry.getLabel());
				formattedEntry.put('value', entry.getValue());
				formattedPicklistEntries.add(formattedEntry);
			} 
			fieldPicklistValues.put(fieldName, formattedPicklistEntries);
		}
	}

	result.put(sobjecttype, fieldPicklistValues);
}

System.debug(JSON.serialize(result));