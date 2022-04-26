import type {DeferredObject} from "@tutao/tutanota-utils"
import {assertNotNull, defer} from "@tutao/tutanota-utils"
import {assertMainOrNodeBoot} from "../common/Env"
import type {IUserController, UserControllerInitData} from "./UserController"
import {getWhitelabelCustomizations} from "../../misc/WhitelabelCustomizations"
import {NotFoundError} from "../common/error/RestError"
import {client} from "../../misc/ClientDetector"
import type {LoginFacade} from "../worker/facades/LoginFacade"
import {ResumeSessionErrorReason} from "../worker/facades/LoginFacade"
import type {Credentials} from "../../misc/credentials/Credentials"
import {FeatureType} from "../common/TutanotaConstants";
import {CredentialsAndDatabaseKey} from "../../misc/credentials/CredentialsProvider"
import {SessionType} from "../common/SessionType"
import {IMainLocator} from "./MainLocator"

assertMainOrNodeBoot()

export interface IPostLoginAction {
	onLoginSuccess(loggedInEvent: LoggedInEvent): Promise<void>
}

export type LoggedInEvent = {
	readonly sessionType: SessionType
}

export type ResumeSessionResult =
	| {type: "success"}
	| {type: "error", reason: ResumeSessionErrorReason}

export interface LoginController {
	createSession(username: string, password: string, sessionType: SessionType, databaseKey?: Uint8Array | null): Promise<Credentials>

	createExternalSession(userId: Id, password: string, salt: Uint8Array, clientIdentifier: string, sessionType: SessionType): Promise<Credentials>

	resumeSession(credentials: CredentialsAndDatabaseKey, externalUserSalt?: Uint8Array): Promise<ResumeSessionResult>

	isUserLoggedIn(): boolean

	isFullyLoggedIn(): boolean

	waitForUserLogin(): Promise<void>

	waitForFullLogin(): Promise<void>

	isInternalUserLoggedIn(): boolean

	isGlobalAdminUserLoggedIn(): boolean

	getUserController(): IUserController

	isEnabled(feature: FeatureType): boolean

	isWhitelabel(): boolean

	logout(sync: boolean): Promise<void>

	deleteOldSession(credentials: Credentials): Promise<void>

	addPostLoginAction(handler: IPostLoginAction): void

	retryAsyncLogin(): Promise<void>
}

export class LoginControllerImpl implements LoginController {
	private userController: IUserController | null = null
	private customizations: NumberString[] | null = null
	private userLogin: DeferredObject<void> = defer()
	private _isWhitelabel: boolean = !!getWhitelabelCustomizations(window)
	private postLoginActions: Array<IPostLoginAction> = []
	private fullyLoggedIn: boolean = false

	async init() {
		this.waitForFullLogin().then(() => {
			this.fullyLoggedIn = true
		})
	}

	private async getMainLocator(): Promise<IMainLocator> {
		const {locator} = await import("./MainLocator")
		await locator.initialized
		return locator
	}

	private async getLoginFacade(): Promise<LoginFacade> {
		const locator = await this.getMainLocator()
		const worker = locator.worker
		await worker.initialized
		return locator.loginFacade
	}

	async createSession(username: string, password: string, sessionType: SessionType, databaseKey: Uint8Array | null): Promise<Credentials> {
		const loginFacade = await this.getLoginFacade()
		const {user, credentials, sessionId, userGroupInfo} = await loginFacade.createSession(
			username,
			password,
			client.getIdentifier(),
			sessionType,
			databaseKey
		)
		await this.onLoginSuccess(
			{
				user,
				userGroupInfo,
				sessionId,
				accessToken: credentials.accessToken,
				sessionType,
			},
			sessionType,
		)
		return credentials
	}

	addPostLoginAction(handler: IPostLoginAction) {
		this.postLoginActions.push(handler)
	}

	async onLoginSuccess(initData: UserControllerInitData, sessionType: SessionType): Promise<void> {
		// FIXME
		console.log("LOGIN partial success")
		const {initUserController} = await import("./UserController")
		this.userController = await initUserController(initData)
		// FIXME
		console.log("LOGIN user controller set")
		await this.loadCustomizations()
		await this._determineIfWhitelabel()

		// FIXME
		console.log("LOGIN calling handlers")
		for (const handler of this.postLoginActions) {
			await handler.onLoginSuccess({
				sessionType,
			})
		}

		this.userLogin.resolve()
	}

	async createExternalSession(userId: Id, password: string, salt: Uint8Array, clientIdentifier: string, sessionType: SessionType): Promise<Credentials> {
		const loginFacade = await this.getLoginFacade()
		const persistentSession = sessionType === SessionType.Persistent
		const {
			user,
			credentials,
			sessionId,
			userGroupInfo
		} = await loginFacade.createExternalSession(userId, password, salt, clientIdentifier, persistentSession)
		await this.onLoginSuccess(
			{
				user,
				accessToken: credentials.accessToken,
				sessionType,
				sessionId,
				userGroupInfo,
			},
			SessionType.Login,
		)
		return credentials
	}

	async resumeSession({credentials, databaseKey}: CredentialsAndDatabaseKey, externalUserSalt?: Uint8Array): Promise<ResumeSessionResult> {
		const loginFacade = await this.getLoginFacade()
		const resumeResult = await loginFacade.resumeSession(credentials, externalUserSalt ?? null, databaseKey ?? null)
		if (resumeResult.type === "error") {
			return resumeResult
		} else {
			const {user, userGroupInfo, sessionId} = resumeResult.data
			await this.onLoginSuccess(
				{
					user,
					accessToken: credentials.accessToken,
					userGroupInfo,
					sessionId,
					sessionType: SessionType.Persistent,
				},
				SessionType.Persistent,
			)
			return {type: "success"}
		}
	}

	isUserLoggedIn(): boolean {
		return this.userController != null
	}

	isFullyLoggedIn(): boolean {
		return this.fullyLoggedIn
	}

	waitForUserLogin(): Promise<void> {
		return this.userLogin.promise
	}

	async waitForFullLogin(): Promise<void> {
		const locator = await this.getMainLocator()
		return locator.loginListener.waitForFullLogin()
	}

	isInternalUserLoggedIn(): boolean {
		return this.isUserLoggedIn() && this.getUserController().isInternalUser()
	}

	isGlobalAdminUserLoggedIn(): boolean {
		return this.isUserLoggedIn() && this.getUserController().isGlobalAdmin()
	}

	getUserController(): IUserController {
		return assertNotNull(this.userController) // only to be used after login (when user is defined)
	}

	isEnabled(feature: FeatureType): boolean {
		return this.customizations != null ? this.customizations.indexOf(feature) !== -1 : false
	}

	loadCustomizations(): Promise<void> {
		if (this.isInternalUserLoggedIn()) {
			return this.getUserController()
					   .loadCustomer()
					   .then(customer => {
						   this.customizations = customer.customizations.map(f => f.feature)
					   })
		} else {
			return Promise.resolve()
		}
	}

	async logout(sync: boolean): Promise<void> {
		// FIXME
		console.log("LOGIN logout")
		if (this.userController) {
			await this.userController.deleteSession(sync)
			this.userController = null
			this.userLogin = defer()
		} else {
			console.log("No session to delete")
		}
	}

	async _determineIfWhitelabel(): Promise<void> {
		this._isWhitelabel = await this.getUserController().isWhitelabelAccount()
	}

	isWhitelabel(): boolean {
		return this._isWhitelabel
	}

	async deleteOldSession(credentials: Credentials): Promise<void> {
		const loginFacade = await this.getLoginFacade()

		try {
			await loginFacade.deleteSession(credentials.accessToken)
		} catch (e) {
			if (e instanceof NotFoundError) {
				console.log("session already deleted")
			} else {
				throw e
			}
		}
	}

	async retryAsyncLogin() {
		const loginFacade = await this.getLoginFacade()
		await loginFacade.retryAsyncLogin()
	}
}

const loginController = new LoginControllerImpl()
export const logins: LoginController = loginController

// Should be called elsewhere later e.g. in mainLocator
loginController.init()