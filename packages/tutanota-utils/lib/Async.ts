export const enum AsyncStatus {
	Pending,
	Resolved,
	Rejected
}
type Pending<T> = {
	status: AsyncStatus.Pending,
	promise: Promise<T>
}

type Resolved<T> = {
	status: AsyncStatus.Resolved
	result: T
}

type Rejected = {
	status: AsyncStatus.Rejected
	error: any
}

type AsyncState<T> = Pending<T> | Resolved<T> | Rejected

type PromiseCallback<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void

/**
 * Represents a resource that is either not ready, ready, or error
 * Sort of fills a similar role to LazyLoaded, usage is more verbose but also more typesafe. maybe this should be reconciled.
 */
export class Async<T> {
	private _state: AsyncState<T>

	constructor(promiseOrCallback: PromiseCallback<T> | Promise<T>) {

		const promise = promiseOrCallback instanceof Promise
			? promiseOrCallback
			: new Promise(promiseOrCallback)

		promise.then(
			value => {
				this._state = complete(value)
			},
			error => {
				this._state = failure(error)
			}
		)

		this._state = pending(promise)

	}

	state(): Readonly<AsyncState<T>> {
		return this._state
	}

	result(): T | null {
		return this._state.status === AsyncStatus.Resolved
			? this._state.result
			: null
	}

	promise(): Promise<T> {
		switch (this._state.status) {
			case AsyncStatus.Pending: return this._state.promise
			case AsyncStatus.Resolved: return Promise.resolve(this._state.result)
			case AsyncStatus.Rejected: return Promise.reject(this._state.error)
		}
	}

	isFinished(): boolean {
		return this._state.status !== AsyncStatus.Pending
	}

	static completed<T>(value: T): Async<T> {
		return new Async(Promise.resolve(value))
	}
}

function pending<T>(promise: Promise<T>): Pending<T> {
	return {
		status:AsyncStatus.Pending,
		promise
	}
}

function complete<T>(result: T): Resolved<T> {
	return {
		status: AsyncStatus.Resolved,
		result,
	}
}

function failure(error: any): Rejected {
	return {
		status: AsyncStatus.Rejected,
		error,
	}
}