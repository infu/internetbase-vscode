import {
	authentication,
	AuthenticationProvider,
	AuthenticationProviderAuthenticationSessionsChangeEvent,
	AuthenticationSession,
	Disposable,
	Event,
	EventEmitter,
	SecretStorage,
	window,
	env,
	Uri,
} from "vscode";

import { AuthClient } from "@dfinity/auth-client";

import getRandomValues from "get-random-values";
import { sha256 } from "js-sha256";

import {
	Ed25519KeyIdentity,
	DelegationChain,
	Ed25519PublicKey,
} from "@dfinity/identity";

// @ts-ignore
import Passphrase from "./mnemonic.js";

class BlastPatSession implements AuthenticationSession {
	// We don't know the user's account name, so we'll just use a constant
	readonly account = {
		id: BlastAuthenticationProvider.id,
		label: "Blast Identity",
	};
	// This id isn't used for anything in this example, so we set it to a constant
	readonly id = BlastAuthenticationProvider.id;
	// We don't know what scopes the PAT has, so we have an empty array here.
	readonly scopes = [];

	/**
	 *
	 * @param accessToken The personal access token to use for authentication
	 */
	constructor(public readonly accessToken: string) {}
}

export class BlastAuthenticationProvider
	implements AuthenticationProvider, Disposable
{
	static id = "BlastIdentity";
	private static secretKey = "BlastIdentity";

	// this property is used to determine if the token has been changed in another window of VS Code.
	// It is used in the checkForUpdates function.
	private currentToken: Promise<string | undefined> | undefined;
	private initializedDisposable: Disposable | undefined;

	private _onDidChangeSessions =
		new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();
	get onDidChangeSessions(): Event<AuthenticationProviderAuthenticationSessionsChangeEvent> {
		return this._onDidChangeSessions.event;
	}

	constructor(private readonly secretStorage: SecretStorage) {}

	dispose(): void {
		this.initializedDisposable?.dispose();
	}

	private ensureInitialized(): void {
		if (this.initializedDisposable === undefined) {
			void this.cacheTokenFromStorage();

			this.initializedDisposable = Disposable.from(
				// This onDidChange event happens when the secret storage changes in _any window_ since
				// secrets are shared across all open windows.
				this.secretStorage.onDidChange((e) => {
					if (e.key === BlastAuthenticationProvider.secretKey) {
						void this.checkForUpdates();
					}
				}),
				// This fires when the user initiates a "silent" auth flow via the Accounts menu.
				authentication.onDidChangeSessions((e) => {
					if (e.provider.id === BlastAuthenticationProvider.id) {
						void this.checkForUpdates();
					}
				})
			);
		}
	}

	// This is a crucial function that handles whether or not the token has changed in
	// a different window of VS Code and sends the necessary event if it has.
	private async checkForUpdates(): Promise<void> {
		const added: AuthenticationSession[] = [];
		const removed: AuthenticationSession[] = [];
		const changed: AuthenticationSession[] = [];

		const previousToken = await this.currentToken;
		const session = (await this.getSessions())[0];

		if (session?.accessToken && !previousToken) {
			added.push(session);
		} else if (!session?.accessToken && previousToken) {
			removed.push(session);
		} else if (session?.accessToken !== previousToken) {
			changed.push(session);
		} else {
			return;
		}

		void this.cacheTokenFromStorage();
		this._onDidChangeSessions.fire({
			added: added,
			removed: removed,
			changed: changed,
		});
	}

	private cacheTokenFromStorage() {
		this.currentToken = this.secretStorage.get(
			BlastAuthenticationProvider.secretKey
		) as Promise<string | undefined>;
		return this.currentToken;
	}

	// This function is called first when `vscode.authentication.getSessions` is called.
	async getSessions(
		_scopes?: string[]
	): Promise<readonly AuthenticationSession[]> {
		this.ensureInitialized();
		const token = await this.cacheTokenFromStorage();
		return token ? [new BlastPatSession(token)] : [];
	}

	// This function is called after `this.getSessions` is called and only when:
	// - `this.getSessions` returns nothing but `createIfNone` was set to `true` in `vscode.authentication.getSessions`
	// - `vscode.authentication.getSessions` was called with `forceNewSession: true`
	// - The end user initiates the "silent" auth flow via the Accounts menu
	async createSession(_scopes: string[]): Promise<AuthenticationSession> {
		const mnem = await window.showInputBox({
			ignoreFocusOut: true,
			placeHolder: "Mnemonic phrase",
			prompt: "Enter mnemonic phrase or leave empty to generate new identity",
			password: false,
		});

		let entropy: Uint8Array;
		if (mnem && mnem?.trim().length > 0) {
			entropy = await Passphrase.decode(mnem);
		} else {
			entropy = getRandomValues(new Uint8Array(32));
			const mnemonic = await Passphrase.encode(entropy);

			const answer = await window.showInformationMessage(
				`! Save your mnemonic phrase:\n ${mnemonic}`,
				"Yes, I saved it"
			);
			if (answer !== "Yes, I saved it") {
				throw new Error("Mnemonic phrase not saved");
			}
		}

		this.ensureInitialized();
		const identity = Ed25519KeyIdentity.generate(entropy);
		const token = JSON.stringify(identity.toJSON());

		// Don't set `currentToken` here, since we want to fire the proper events in the `checkForUpdates` call
		await this.secretStorage.store(
			BlastAuthenticationProvider.secretKey,
			token
		);
		console.log("Successfully created Blast identity");

		return new BlastPatSession(token);
	}

	// This function is called when the end user signs out of the account.
	async removeSession(_sessionId: string): Promise<void> {
		await this.secretStorage.delete(BlastAuthenticationProvider.secretKey);
	}
}

// export const getIdentityFromPass = pass => {
//   const hash = sha256.create();
//   hash.update(pass);

//   const entropy = new Uint8Array(hash.digest()); //sha256(pass);

//   const identity = Ed25519KeyIdentity.generate(entropy);

//   return identity;
// };
