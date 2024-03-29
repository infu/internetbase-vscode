// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { activate as activateBlast } from "./blast/extension";
import { activate as activateExplorer } from "./explorer/extension";
import { activate as activateAuth } from "./auth/extension";

// This method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	activateExplorer(context);
	activateBlast(context);
	activateAuth(context);
}

// This method is called when your extension is deactivated
export function deactivate() {
	// Noop
}
