import o from "ospec"
import {TimeRangedCacheStorage} from "../../../../src/api/worker/rest/cache/TimeRangedCacheStorage"
import {OfflineStorage} from "../../../../src/api/worker/rest/cache/OfflineStorage"
import {EphemeralCacheStorage} from "../../../../src/api/worker/rest/cache/EphemeralCacheStorage"
import {instance, matchers, when} from "testdouble"
import {timestampToGeneratedId} from "../../../../src/api/common/utils/EntityUtils"
import {createMailBody} from "../../../../src/api/entities/tutanota/MailBody"
import {getDayShifted} from "@tutao/tutanota-utils"
import {verify} from "@tutao/tutanota-test-utils"
import {createMail, MailTypeRef} from "../../../../src/api/entities/tutanota/Mail"

const {anything} = matchers

o.spec("TimeRangedCacheStorage", function () {


	const CUTOFF_DATE = new Date("2022-01-01 00:00:00 UTC")
	const getTimestampFromOffset = days => getDayShifted(CUTOFF_DATE, days).getTime()
	const getIdFromOffset = days => timestampToGeneratedId(getTimestampFromOffset(days))

	let ephemeralStorage: EphemeralCacheStorage
	let persistentStorage: OfflineStorage
	let storage: TimeRangedCacheStorage

	o.beforeEach(function () {
		ephemeralStorage = instance(EphemeralCacheStorage)
		persistentStorage = instance(OfflineStorage)

		storage = new TimeRangedCacheStorage(
			CUTOFF_DATE,
			ephemeralStorage,
			persistentStorage,
		)
	})

	o.spec("Putting entities", function () {
		o("Newer element entities should be stored persistently", async function () {
			const entity = createMailBody({
				_id: getIdFromOffset(1)
			})
			await storage.put(entity)

			verify(persistentStorage.put(entity))
			verify(ephemeralStorage.put(matchers.anything()), {times: 0})
		})

		o("Newer list element entities should be stored persistently", async function () {
			const entity = createMail({
				_id: ["listId", getIdFromOffset(1)]
			})

			await storage.put(entity)

			verify(persistentStorage.put(entity))
			verify(ephemeralStorage.put(matchers.anything()), {times: 0})
		})

		o("Older element entities should be stored temporarily", async function () {
			const entity = createMailBody({
				_id: getIdFromOffset(-1)
			})
			await storage.put(entity)

			verify(ephemeralStorage.put(entity))
			verify(persistentStorage.put(matchers.anything()), {times: 0})
		})

		o("Older list element entities should be stored temporarily", async function () {
			const entity = createMail({
				_id: ["listId", getIdFromOffset(-1)]
			})

			await storage.put(entity)

			verify(ephemeralStorage.put(entity))
			verify(persistentStorage.put(matchers.anything()), {times: 0})
		})

		o("Ranges should be written correctly", async function () {

		})
	})

	o.spec("Ranges", function () {

		o.spec("create", function () {
			o("A range is created in persistent storage, none in temporary", async function () {
				const upperId = getIdFromOffset(10)
				const lowerId = getIdFromOffset(5)
				await storage.setNewRangeForList(MailTypeRef, "listId", lowerId, upperId)

				const temporaryStorageRange = timestampToGeneratedId(getTimestampFromOffset(0) - 1)
				verify(persistentStorage.setNewRangeForList(MailTypeRef, "listId", lowerId, upperId))
				verify(ephemeralStorage.setNewRangeForList(MailTypeRef, "listId", temporaryStorageRange, temporaryStorageRange), {times: 0})
			})

			o("A range is created in temporary storage, none in persistent", async function () {
				const upperId = getIdFromOffset(-5)
				const lowerId = getIdFromOffset(-10)
				await storage.setNewRangeForList(MailTypeRef, "listId", lowerId, upperId)

				verify(ephemeralStorage.setNewRangeForList(MailTypeRef, "listId", lowerId, upperId))
				verify(persistentStorage.setNewRangeForList(MailTypeRef, "listId", getIdFromOffset(0), getIdFromOffset(0)), {times: 0})
			})

			o("A range is created that spans both storages", async function () {
				const upperId = getIdFromOffset(10)
				const lowerId = getIdFromOffset(-10)
				await storage.setNewRangeForList(MailTypeRef, "listId", lowerId, upperId)

				verify(persistentStorage.setNewRangeForList(MailTypeRef, "listId", getIdFromOffset(0), upperId))
				verify(ephemeralStorage.setNewRangeForList(MailTypeRef, "listId", lowerId, getIdFromOffset(0)))
			})
		})

		o.spec("update", function () {

			o("Lower range in persistent cache should be the cutoff timestamp", async function () {
				const lowerId = getIdFromOffset(-1)
				await storage.setLowerRangeForList(MailTypeRef, "listId", lowerId)

				verify(persistentStorage.setLowerRangeForList(MailTypeRef, "listId", getIdFromOffset(0)))
			})

			o("Lower range in persistent cache should be the specified timestamp", async function () {
				const lowerId = getIdFromOffset(1)
				await storage.setLowerRangeForList(MailTypeRef, "listId", lowerId)

				verify(persistentStorage.setLowerRangeForList(MailTypeRef, "listId", lowerId))
			})
		})
	})

	o.spec("Reading", function () {
		o.spec("Ranges", function() {

			const tests = [
				{
					name: "",
					persistent: [],
					ephemeral: [],
					request: [],
					expected: []
				}
			]

			for (let {name, persistent, ephemeral, request, expected} of tests) {
				o(name, function() {
					when(persistentStorage.provideFromRange())
				})
			}

			o("should read full range from persistent storage", function() {

			})
			o("should read full range from")
		})
	})

	o.spec("Clearing", function () {

	})
})