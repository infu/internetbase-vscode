// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// @ts-ignore
import { html as view_explorer_html } from "../../views/explorer/build/index.html.js";

// This method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const provider = new ColorsViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			ColorsViewProvider.viewType,
			provider
		)
	);
}

// This method is called when your extension is deactivated
export function deactivate() {
	// Noop
}

class ColorsViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "ib.explorer";

	private _view?: vscode.WebviewView;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [this._extensionUri],
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage((data) => {
			switch (data.type) {
				case "insertMethod": {
					vscode.window.activeTextEditor?.insertSnippet(
						new vscode.SnippetString(data.value)
					);
					break;
				}
			}
		});
	}

	// public addColor() {
	// 	if (this._view) {
	// 		this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
	// 		this._view.webview.postMessage({ type: "addColor" });
	// 	}
	// }

	// public clearColors() {
	// 	if (this._view) {
	// 		this._view.webview.postMessage({ type: "clearColors" });
	// 	}
	// }

	private _getHtmlForWebview(webview: vscode.Webview) {
		return view_explorer_html.replace(
			"<head>",
			`<head><base href="${webview.asWebviewUri(
				vscode.Uri.joinPath(this._extensionUri, "views", "explorer", "build")
			)}/">`
		);
	}
}
