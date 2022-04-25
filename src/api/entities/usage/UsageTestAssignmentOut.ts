import {create} from "../../common/utils/EntityUtils.js"
import {TypeRef, downcast} from "@tutao/tutanota-utils"
import type {TypeModel} from "../../common/EntityTypes.js"

import type {UsageTestAssignment} from "./UsageTestAssignment.js"

export const UsageTestAssignmentOutTypeRef: TypeRef<UsageTestAssignmentOut> = new TypeRef("usage", "UsageTestAssignmentOut")
export const _TypeModel: TypeModel = {
	"name": "UsageTestAssignmentOut",
	"since": 1,
	"type": "DATA_TRANSFER_TYPE",
	"id": 63,
	"rootId": "BXVzYWdlAD8",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_format": {
			"id": 64,
			"type": "Number",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		},
		"testDeviceId": {
			"id": 65,
			"type": "GeneratedId",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		}
	},
	"associations": {
		"assignments": {
			"id": 66,
			"type": "AGGREGATION",
			"cardinality": "Any",
			"final": false,
			"refType": "UsageTestAssignment",
			"dependency": null
		}
	},
	"app": "usage",
	"version": "1"
}

export function createUsageTestAssignmentOut(values?: Partial<UsageTestAssignmentOut>): UsageTestAssignmentOut {
	return Object.assign(create(_TypeModel, UsageTestAssignmentOutTypeRef), downcast<UsageTestAssignmentOut>(values))
}

export type UsageTestAssignmentOut = {
	_type: TypeRef<UsageTestAssignmentOut>;

	_format: NumberString;
	testDeviceId: Id;

	assignments: UsageTestAssignment[];
}