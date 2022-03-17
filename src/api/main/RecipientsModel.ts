import {Contact, ContactTypeRef} from "../entities/tutanota/Contact.js";
import type {ContactModel} from "../../contacts/model/ContactModel.js";
import type {LoginController} from "./LoginController.js";
import type {MailFacade} from "../worker/facades/MailFacade.js";
import type {EntityClient} from "../common/EntityClient.js";
import {createNewContact, isTutanotaMailAddress} from "../../mail/model/MailUtils.js";
import {getContactDisplayName} from "../../contacts/model/ContactUtils.js";
import {PartialRecipient, Recipient, RecipientType} from "../common/recipients/Recipient.js";
import {Async} from "@tutao/tutanota-utils"

/**
 * A recipient that can be resolved to obtain contact and recipient type
 */
export interface ResolvableRecipient extends Recipient {
	resolved(): Promise<Recipient>

	isResolved(): boolean

	setContact(contact: Contact): void

	setName(name: string): void
}

export class RecipientsModel {
	constructor(
		private readonly contactModel: ContactModel,
		private readonly loginController: LoginController,
		private readonly mailFacade: MailFacade,
		private readonly entityClient: EntityClient,
	) {
	}

	/**
	 * Start resolving a recipient
	 * If resolveLazily === true, Then resolution will not be initiated (i.e. no server calls will be made) until the first call to `resolved`
	 */
	resolve(parameters: PartialRecipient & {resolveLazily?: boolean}): ResolvableRecipient {
		return new ResolvableRecipientImpl(
			parameters,
			this.contactModel,
			this.loginController,
			this.mailFacade,
			this.entityClient,
			parameters.resolveLazily ?? false
		)
	}
}

class ResolvableRecipientImpl implements ResolvableRecipient {
	public readonly address: string
	private _name: string | null

	/** when {@member resolveLazily} === true, will be null until first call to resolve */
	private _type: Async<RecipientType> | null

	/** when {@member resolveLazily} === true, will be null until first call to resolve */
	private _contact: Async<Contact | null> | null

	private contactId: IdTuple | null = null

	get name(): string {
		return this._name ?? ""
	}

	get type(): RecipientType {
		return this._type?.result() ?? RecipientType.UNKNOWN
	}

	get contact(): Contact | null {
		return this._contact?.result() ?? null
	}

	constructor(
		arg: PartialRecipient,
		private readonly contactModel: ContactModel,
		private readonly loginController: LoginController,
		private readonly mailFacade: MailFacade,
		private readonly entityClient: EntityClient,
		private readonly resolveLazily: boolean = false
	) {
		this.address = arg.address
		this._name = arg.name ?? null
		this._type = this.resolveType(arg.type)
		this._contact = this.resolveContact(arg.contact)

		this._contact?.promise().then(contact => {
			if (contact != null && this._name == null) {
				this._name = getContactDisplayName(contact)
			}
		})
	}

	setName(newName: string) {
		this._name = newName
	}

	setContact(newContact: Contact) {
		this._contact = Async.completed(newContact)
	}

	async resolved(): Promise<Recipient> {

		if (this._type == null) {
			this._type = new Async(this.doResolveType())
		}

		if (this._contact == null) {
			this._contact = new Async(this.doResolveContact(this.contactId))
		}

		await Promise.all([this._type, this._contact])

		return {
			address: this.address,
			name: this.name,
			type: this.type,
			contact: this.contact,
		}
	}

	isResolved(): boolean {
		// We are only resolved when both type and contact are non-null and finished
		return !!this._type?.isFinished() && !!this._contact?.isFinished()
	}

	private resolveType(type: RecipientType | None): Async<RecipientType> | null {

		if (isTutanotaMailAddress(this.address)) {
			return Async.completed(RecipientType.INTERNAL)
		}

		if (type && type !== RecipientType.UNKNOWN) {
			return Async.completed(type)
		}

		if (this.resolveLazily) {
			return null
		}

		return new Async(this.doResolveType())
	}

	/**
	 * Determine whether recipient is INTERNAL or EXTERNAL based on the existence of key data (external recipients don't have any)
	 */
	private async doResolveType(): Promise<RecipientType> {
		const keyData = await this.mailFacade.getRecipientKeyData(this.address)
		return keyData == null ? RecipientType.EXTERNAL : RecipientType.INTERNAL
	}

	private resolveContact(contact: Contact | IdTuple | None): Async<Contact | null> | null {

		if (contact != null && !(contact instanceof Array)) {
			return Async.completed(contact)
		}

		if (this.resolveLazily) {
			if (contact instanceof Array) {
				this.contactId = contact
			}
			return null
		}

		return new Async(this.doResolveContact(contact))
	}

	/**
	 * Resolve the recipients contact.
	 * If {@param contact} is an Id, the contact will be loaded directly
	 * Otherwise, the contact will be searched for in the ContactModel
	 */
	private async doResolveContact(contact: IdTuple | None): Promise<Contact | null> {
		try {
			if (contact != null) {
				return await this.entityClient.load(ContactTypeRef, contact)
			} else if (this.loginController.isInternalUserLoggedIn()) {
				return await this.contactModel.searchForContact(this.address)
					?? createNewContact(this.loginController.getUserController().user, this.address, this.name)
			}
		} catch (e) {
			console.log("error resolving contact", e)
		}

		return null
	}
}
