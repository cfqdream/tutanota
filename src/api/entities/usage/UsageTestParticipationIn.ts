import {create} from "../../common/utils/EntityUtils.js"
import {TypeRef, downcast} from "@tutao/tutanota-utils"
import type {TypeModel} from "../../common/EntityTypes.js"

import type {UsageTestMetricData} from "./UsageTestMetricData.js"

export const UsageTestParticipationInTypeRef: TypeRef<UsageTestParticipationIn> = new TypeRef("usage", "UsageTestParticipationIn")
export const _TypeModel: TypeModel = {
	"name": "UsageTestParticipationIn",
	"since": 1,
	"type": "DATA_TRANSFER_TYPE",
	"id": 83,
	"rootId": "BXVzYWdlAFM",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_format": {
			"id": 84,
			"type": "Number",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		},
		"stage": {
			"id": 86,
			"type": "Number",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		},
		"testDeviceId": {
			"id": 87,
			"type": "GeneratedId",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		},
		"testId": {
			"id": 85,
			"type": "GeneratedId",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		}
	},
	"associations": {
		"metrics": {
			"id": 88,
			"type": "AGGREGATION",
			"cardinality": "Any",
			"final": false,
			"refType": "UsageTestMetricData",
			"dependency": null
		}
	},
	"app": "usage",
	"version": "1"
}

export function createUsageTestParticipationIn(values?: Partial<UsageTestParticipationIn>): UsageTestParticipationIn {
	return Object.assign(create(_TypeModel, UsageTestParticipationInTypeRef), downcast<UsageTestParticipationIn>(values))
}

export type UsageTestParticipationIn = {
	_type: TypeRef<UsageTestParticipationIn>;

	_format: NumberString;
	stage: NumberString;
	testDeviceId: Id;
	testId: Id;

	metrics: UsageTestMetricData[];
}