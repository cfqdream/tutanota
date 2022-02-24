import {CANCELLED, getPassword, setPassword} from "keytar"
import {CancelledError} from "../../api/common/error/CancelledError"
import {noOp} from "@tutao/tutanota-utils"
import {ElectronExports, FsExports, PathExports} from "../ElectronExportTypes"
import {DeviceStorageUnavailableError} from "../../api/common/error/DeviceStorageUnavailableError"
import {log} from "../DesktopLog"

export interface SecretStorage {
	getPassword(service: string, account: string): Promise<string | null>

	setPassword(service: string, account: string, password: string): Promise<void>
}

class KeytarSecretStorage implements SecretStorage {

	/**
	 * keytar can't handle concurrent accesses to the keychain, so we need to sequence
	 * calls to getPassword and setPassword.
	 * this promise chain stores pending operations.
	 */
	private lastOp: Promise<unknown> = Promise.resolve()

	getPassword(service: string, account: string): Promise<string | null> {
		const newOp = this.lastOp
						  .catch(noOp)
						  .then(() => getPassword(service, account)
							  .catch(e => {
								  if (e.message === CANCELLED) {
									  throw new CancelledError("user cancelled keychain unlock")
								  }
								  throw e
							  }))
		this.lastOp = newOp

		return newOp
	}

	setPassword(service: string, account: string, password: string): Promise<void> {
		const newOp = this.lastOp
						  .catch(noOp)
						  .then(() => setPassword(service, account, password))
		this.lastOp = newOp
		return newOp
	}
}

/**
 * Secret Storage impl using the electron 15+ SafeStorage API
 *
 * Note: the main thread will be blocked while the keychain is being unlocked,
 * potentially for as long as the user takes to enter a password.
 * We're asking for access before any windows are created, which should prevent
 * any weirdness arising from that.
 */
export class SafeStorageSecretStorage implements SecretStorage {
	_safeStorage: Electron.SafeStorage
	_app: Electron.App
	_fs: FsExports
	_path: PathExports
	_keytarSecretStorage: KeytarSecretStorage

	constructor({safeStorage, app}: ElectronExports, fs: FsExports, path: PathExports) {
		this._safeStorage = safeStorage
		this._app = app
		this._fs = fs
		this._path = path
		this._keytarSecretStorage = new KeytarSecretStorage()
	}

	async getPassword(service: string, account: string): Promise<string | null> {
		await this._assertAvailable()
		await this._migrateKeytarPassword(service, account)
		const keyPath = this._getKeyPath(service, account)
		try {
			const encPwBuffer = await this._fs.promises.readFile(keyPath)
			const plainPw = this._safeStorage.decryptString(encPwBuffer)
			return Promise.resolve(plainPw)
		} catch (e) {
			if (e.code === "ENOENT") return null
			throw e
		}
	}

	async setPassword(service: string, account: string, password: string): Promise<void> {
		await this._assertAvailable()
		const keyPath = this._getKeyPath(service, account)
		const cypherBuffer = this._safeStorage.encryptString(password)
		return this._fs.promises.writeFile(keyPath, cypherBuffer)
	}

	_getKeyPath(service: string, account: string): string {
		const fname = service.concat("-", account)
		const safeStoragePath = this._getSafeStoragePath()
		return this._path.join(safeStoragePath, fname)
	}

	/**
	 * this should always be a path inside the user's home directory (or equivalent)
	 * @private
	 */
	_getSafeStoragePath(): string {
		return this._path.join(this._app.getPath('userData'), "safe_storage")
	}

	/**
	 * ensures that the safe_storage directory exists and that we can use the
	 * safeStorage API
	 * @private
	 */
	async _assertAvailable(): Promise<void> {
		await this._fs.promises.mkdir(this._getSafeStoragePath(), {recursive: true})
		if (this._safeStorage.isEncryptionAvailable()) return
		throw new DeviceStorageUnavailableError("safeStorage API is not available", null)
	}

	/**
	 * most devices will have stored a deviceKey with keytar, which we can move
	 * to the safeStorage impl.
	 *
	 * @private
	 */
	async _migrateKeytarPassword(service: string, account: string): Promise<void> {
		let keytarPw: string | null = null
		try {
			keytarPw = await this._keytarSecretStorage.getPassword(service, account)
		} catch (e) {
			log.debug("keytar failed, assuming there's no pw stored")
		}
		if (keytarPw) {
			await this.setPassword(service, account, keytarPw)
			// do not do this until later. there may be multiple installs using
			// the deviceKey if for some reason keytar used a system keychain
			// to store it.
			// await this._keytarSecretStorage.deletePassword(service, account)
		}
	}
}