import {CacheRange, CacheStorage} from "./EntityRestCache.js"
import {EphemeralCacheStorage} from "./EphemeralCacheStorage"
import {OfflineStorage} from "./OfflineStorage"
import {ListElementEntity, SomeEntity} from "../../../common/EntityTypes"
import {TypeRef} from "@tutao/tutanota-utils"
import {
	firstBiggerThanSecond, GENERATED_MAX_ID,
	GENERATED_MIN_ID,
	generatedIdToTimestamp,
	getEntityCreationTimestamp,
	timestampToGeneratedId
} from "../../../common/utils/EntityUtils"

export class TimeRangedCacheStorage implements CacheStorage {

	private cutoffTimestamp: number
	private cutoffId: Id
	private ephemeralMaxId: Id

	constructor(
		private cutoffDate: Date,
		private readonly ephemeralStorage: EphemeralCacheStorage,
		private readonly persistentStorage: OfflineStorage,
	) {
		this.cutoffTimestamp = cutoffDate.getTime()
		this.cutoffId = timestampToGeneratedId(this.cutoffTimestamp)
		this.ephemeralMaxId = timestampToGeneratedId(this.cutoffTimestamp - 1)
	}

	async deleteIfExists<T extends SomeEntity>(typeRef: TypeRef<T>, listId: Id | null, id: Id): Promise<void> {
		return Promise.resolve(undefined);
	}

	async get<T extends SomeEntity>(typeRef: TypeRef<T>, listId: Id | null, id: Id): Promise<T | null> {
		return (await this.ephemeralStorage.get(typeRef, listId, id)) ?? (await this.persistentStorage.get(typeRef, listId, id))
	}

	async getIdsInRange<T extends ListElementEntity>(typeRef: TypeRef<T>, listId: Id): Promise<Array<Id>> {
		const ephemeralIds = await this.ephemeralStorage.getIdsInRange(typeRef, listId)
		const persistentIds = await this.persistentStorage.getIdsInRange(typeRef, listId)
		return persistentIds.concat(ephemeralIds)
	}

	getLastBatchIdForGroup(groupId: Id): Promise<Id | null> {
		throw new Error("TODO")
	}

	getLastUpdateTime(): Promise<number | null> {
		throw new Error("TODO")
	}

	getRangeForList<T extends ListElementEntity>(typeRef: TypeRef<T>, listId: Id): Promise<CacheRange | null> {
		throw new Error("TODO")
	}

	isElementIdInCacheRange<T extends ListElementEntity>(typeRef: TypeRef<T>, listId: Id, id: Id): Promise<boolean> {
		throw new Error("TODO")
	}

	async provideFromRange<T extends ListElementEntity>(typeRef: TypeRef<T>, listId: Id, start: Id, count: number, reverse: boolean): Promise<T[]> {
		if (reverse) {
			return this.provideFromRangeReverse(typeRef, listId, start, count)
		}

		let entities: Array<T> = []
		if (firstBiggerThanSecond(this.cutoffId, start)) {
			entities = await this.ephemeralStorage.provideFromRange(typeRef, listId, start, count, false)
		}

		return entities.concat(
			await this.persistentStorage.provideFromRange(typeRef, listId, GENERATED_MIN_ID, count - entities.length, false)
		)
	}

	private async provideFromRangeReverse<T extends ListElementEntity>(typeRef: TypeRef<T>, listId: Id, start: Id, count: number): Promise<T[]> {
		let entities: Array<T> = []

		if (firstBiggerThanSecond(start, this.cutoffId)) {
			entities = await this.persistentStorage.provideFromRange(typeRef, listId, start, count, true)
		}

		return entities.concat(
			await this.ephemeralStorage.provideFromRange(typeRef, listId, GENERATED_MAX_ID, count - entities.length, true)
		)
	}

	async purgeStorage(): Promise<void> {
		await this.persistentStorage.purgeStorage()
		await this.ephemeralStorage.purgeStorage()
	}

	put(originalEntity: SomeEntity): Promise<void> {
		const entityTimestamp = getEntityCreationTimestamp(originalEntity)

		const storage = entityTimestamp >= this.cutoffDate.getTime()
			? this.persistentStorage
			: this.ephemeralStorage

		return storage.put(originalEntity)
	}

	putLastBatchIdForGroup(groupId: Id, batchId: Id): Promise<void> {
		return this.persistentStorage.putLastBatchIdForGroup(groupId, batchId)
	}

	putLastUpdateTime(value: number): Promise<void> {
		return this.persistentStorage.putLastUpdateTime(value)
	}

	async setLowerRangeForList<T extends ListElementEntity>(typeRef: TypeRef<T>, listId: Id, id: Id): Promise<void> {
		const timestamp = generatedIdToTimestamp(id)
		if (timestamp < this.cutoffTimestamp) {
			if (await this.ephemeralStorage.getRangeForList(typeRef, listId) == null) {
				await this.ephemeralStorage.setNewRangeForList(typeRef, listId, id, this.ephemeralMaxId)
			} else {
				await this.ephemeralStorage.setLowerRangeForList(typeRef, listId, id)
			}
			// The range now goes over the cutoff boundary, so we have to update it in the persistent storage
			await this.persistentStorage.setLowerRangeForList(typeRef, listId, this.cutoffId)
		} else {
			await this.persistentStorage.setLowerRangeForList(typeRef, listId, id)
		}
	}

	async setNewRangeForList<T extends ListElementEntity>(typeRef: TypeRef<T>, listId: Id, lower: Id, upper: Id): Promise<void> {
		const lowerTimestamp = generatedIdToTimestamp(lower)
		const upperTimestamp = generatedIdToTimestamp(upper)

		if (lowerTimestamp < this.cutoffTimestamp && upperTimestamp >= this.cutoffTimestamp) {
			// The range crosses over the cutoff
			await this.persistentStorage.setNewRangeForList(typeRef, listId, this.cutoffId, upper)
			await this.ephemeralStorage.setNewRangeForList(typeRef, listId, lower, this.cutoffId)
		} else if (lowerTimestamp >= this.cutoffTimestamp) {
			// The entire range is newer than the cutoff
			await this.persistentStorage.setNewRangeForList(typeRef, listId, lower, upper)
		} else {
			// The entire range is older than the cutoff
			await this.ephemeralStorage.setNewRangeForList(typeRef, listId, lower, upper)
		}
	}

	setUpperRangeForList<T extends ListElementEntity>(typeRef: TypeRef<T>, listId: Id, id: Id): Promise<void> {
		throw new Error("TODO")
	}
}