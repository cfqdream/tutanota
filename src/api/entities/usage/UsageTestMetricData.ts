import {create} from "../../common/utils/EntityUtils.js"
import {TypeRef, downcast} from "@tutao/tutanota-utils"
import type {TypeModel} from "../../common/EntityTypes.js"


export const UsageTestMetricDataTypeRef: TypeRef<UsageTestMetricData> = new TypeRef("usage", "UsageTestMetricData")
export const _TypeModel: TypeModel = {
	"name": "UsageTestMetricData",
	"since": 1,
	"type": "AGGREGATED_TYPE",
	"id": 17,
	"rootId": "BXVzYWdlABE",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_id": {
			"id": 18,
			"type": "CustomId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"name": {
			"id": 19,
			"type": "String",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"value": {
			"id": 20,
			"type": "String",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		}
	},
	"associations": {},
	"app": "usage",
	"version": "1"
}

export function createUsageTestMetricData(values?: Partial<UsageTestMetricData>): UsageTestMetricData {
	return Object.assign(create(_TypeModel, UsageTestMetricDataTypeRef), downcast<UsageTestMetricData>(values))
}

export type UsageTestMetricData = {
	_type: TypeRef<UsageTestMetricData>;

	_id: Id;
	name: string;
	value: string;
}