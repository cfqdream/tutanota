import {create} from "../../common/utils/EntityUtils.js"
import {TypeRef, downcast} from "@tutao/tutanota-utils"
import type {TypeModel} from "../../common/EntityTypes.js"

import type {UsageTestMetricConfig} from "./UsageTestMetricConfig.js"

export const UsageTestStageTypeRef: TypeRef<UsageTestStage> = new TypeRef("usage", "UsageTestStage")
export const _TypeModel: TypeModel = {
	"name": "UsageTestStage",
	"since": 1,
	"type": "AGGREGATED_TYPE",
	"id": 38,
	"rootId": "BXVzYWdlACY",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_id": {
			"id": 39,
			"type": "CustomId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"name": {
			"id": 40,
			"type": "String",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		}
	},
	"associations": {
		"metrics": {
			"id": 41,
			"type": "AGGREGATION",
			"cardinality": "Any",
			"final": false,
			"refType": "UsageTestMetricConfig",
			"dependency": null
		}
	},
	"app": "usage",
	"version": "1"
}

export function createUsageTestStage(values?: Partial<UsageTestStage>): UsageTestStage {
	return Object.assign(create(_TypeModel, UsageTestStageTypeRef), downcast<UsageTestStage>(values))
}

export type UsageTestStage = {
	_type: TypeRef<UsageTestStage>;

	_id: Id;
	name: string;

	metrics: UsageTestMetricConfig[];
}