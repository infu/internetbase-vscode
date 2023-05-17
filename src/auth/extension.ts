// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import "isomorphic-fetch";
import * as vscode from "vscode";
import { BlastAuthenticationProvider } from "./authProvider";

import {
	Ed25519KeyIdentity,
	DelegationChain,
	Ed25519PublicKey,
} from "@dfinity/identity";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Register our authentication provider. NOTE: this will register the provider globally which means that
	// any other extension can use this provider via the `getSession` API.
	// NOTE: when implementing an auth provider, don't forget to register an activation event for that provider
	// in your package.json file: "onAuthenticationRequest:BlastPAT"
	context.subscriptions.push(
		vscode.authentication.registerAuthenticationProvider(
			BlastAuthenticationProvider.id,
			"Blast Identity",
			new BlastAuthenticationProvider(context.secrets)
		)
	);

	const disposable = vscode.commands.registerCommand(
		"vscode-authenticationprovider-blast.login",
		async () => {
			const session = await vscode.authentication.getSession(
				BlastAuthenticationProvider.id,
				[],
				{ createIfNone: true }
			);

			const identity = Ed25519KeyIdentity.fromJSON(session.accessToken);

			vscode.window.showInformationMessage(
				"Your principal: " + identity.getPrincipal().toString()
			);
		}
	);

	context.subscriptions.push(disposable);
}
