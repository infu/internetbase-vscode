import * as vscode from "vscode";
// import "window-crypto";
import "isomorphic-fetch";

import icblast, {
  toState,
  hashIdentity,
  walletProxy,
  file,
  explainer, // @ts-ignore
} from "@infu/icblast";

import { CanisterStatus } from "@dfinity/agent";
import { runbash } from "./bash";
import {
  Ed25519KeyIdentity,
  DelegationChain,
  DelegationIdentity,
} from "@dfinity/identity";
import { Principal } from "@dfinity/principal";

import { BlastAuthenticationProvider } from "../auth/authProvider";

import { AccountIdentifier, SubAccount } from "../lib/account_identifier";
import { encodeIcrcAccount, decodeIcrcAccount } from "@dfinity/ledger";

import util from "util";

export class SampleKernel {
  private readonly _id = "blast-notebook-serializer-kernel";
  private readonly _label = "Blast Web Kernel";
  private readonly _supportedLanguages = ["javascript"]; // "shellscript"

  private _executionOrder = 0;
  private readonly _controller: vscode.NotebookController;
  public ic = null;
  public identity: Ed25519KeyIdentity | null = null;
  public globalObj = {};
  public console = vscode.window.createOutputChannel("Blast");

  constructor() {
    this._controller = vscode.notebooks.createNotebookController(
      this._id,
      "blast-notebook-serializer",
      this._label
    );

    this._controller.supportedLanguages = this._supportedLanguages;
    this._controller.supportsExecutionOrder = true;
    this._controller.executeHandler = this._executeAll.bind(this);
  }

  private async setupBlast() {
    const session = await vscode.authentication.getSession(
      BlastAuthenticationProvider.id,
      [],
      { createIfNone: true }
    );

    this.identity = Ed25519KeyIdentity.fromJSON(session.accessToken);
    this.ic = icblast({ identity: this.identity });
  }

  dispose(): void {
    this._controller.dispose();
  }

  private _executeAll(
    cells: vscode.NotebookCell[],
    _notebook: vscode.NotebookDocument,
    _controller: vscode.NotebookController
  ): void {
    for (const cell of cells) {
      this._doExecution(cell);
    }
  }

  private async run(cell: vscode.NotebookCell): Promise<any[]> {
    if (cell.document.languageId === "javascript") {
      return this.runjs(cell);
    } else {
      return this.runbash(cell);
    }
  }

  private async runbash(cell: vscode.NotebookCell): Promise<any[]> {
    return runbash(cell.document.getText());
  }

  private async runjs(cell: vscode.NotebookCell): Promise<any[]> {
    const code = cell.document.getText();

    if (this.ic === null) {
      await this.setupBlast();
    }
    /*
		const rcode = `
		
		export const run = async({
			icblast,
			identity,
			ic,
			global,
			globalObj,
			toState,
			log,
			tempIdentity,
			walletProxy,
			file,
			explainer,
			CanisterStatus,
			DelegationChain,
			DelegationIdentity,
			Principal,
			AccountIdentifier,
			SubAccount,encodeIcrcAccount, decodeIcrcAccount
		}) => {
			const {${Object.keys(this.globalObj).join(",")}} = globalObj;
			try {
			return await (async () => {
				${code}
			})()
			} catch (err) { // these non Error objects may not propagate correctly
				let derr = err;
				if (!(err instanceof Error)) {
					derr = new Error(JSON.stringify(err));
				}
				throw derr;
			}
		}
		`;
		// console.log(rcode);
		const dataUri =
			"data:text/javascript;charset=utf-8," + encodeURIComponent(rcode);
		// eslint-disable-next-line no-eval

		const mod = await eval('import("' + dataUri + '")');
*/

    const localPath = (path: string) => {
      const curpath = cell.document.uri.path;
      const dir = curpath.substring(0, curpath.lastIndexOf("/") + 1);
      const root = vscode.Uri.file(dir);
      return vscode.Uri.joinPath(root, path);
      // return vscode.Uri.joinPath(cell.document.uri, "..", path);
      // return vscode.Uri.joinPath(cell.document.uri, "..", path);
    };

    const readDir = (p: string) =>
      vscode.workspace.fs.readDirectory(localPath(p));

    const readFile = (p: string) => vscode.workspace.fs.readFile(localPath(p));

    const readFileText = async (p: string) => {
      const blob = await vscode.workspace.fs.readFile(localPath(p));
      return new TextDecoder().decode(blob);
    };

    const writeFile = (p: string, blob: Uint8Array) =>
      vscode.workspace.fs.writeFile(localPath(p), blob);

    const writeFileText = async (p: string, content: string) => {
      return vscode.workspace.fs.writeFile(
        localPath(p),
        new TextEncoder().encode(content)
      );
    };

    const rcode = `
		
async({
	icblast,
	identity,
	ic,
  me,
	global,
	globalObj,
	toState,
	log,
	hashIdentity,
	walletProxy,
	file,
	explainer,
	CanisterStatus,
	DelegationChain,
	DelegationIdentity,
	Principal,
	AccountIdentifier,
	SubAccount, encodeIcrcAccount, decodeIcrcAccount, 
  readDir,
    readFile,
    readFileText,
    writeFile,
    writeFileText,
}) => {
	const {${Object.keys(this.globalObj).join(",")}} = globalObj;
	try {
	return await (async () => {
		${code}
	})()
	} catch (err) { // these non Error objects may not propagate correctly
		let derr = err;
		if (!(err instanceof Error)) {
			derr = new Error(JSON.stringify(err));
		}
		throw derr;
	}
}
`;

    const modrun = await eval(rcode);

    const logged: any[] = [];
    const log = (msg: any) => {
      this.console.appendLine(
        util.inspect(bigIntToString(msg), {
          showHidden: false,
          depth: null,
          colors: false,
          compact: true,
          numericSeparator: true,
          breakLength: 80,
          maxArrayLength: 100,
        })
      );
      logged.push(toState(msg));
    };

    const global = (arg: object): void => {
      this.globalObj = { ...this.globalObj, ...arg };
    };

    const params = {
      icblast,
      identity: this.identity,
      ic: this.ic,
      me: this.identity?.getPrincipal(),
      global,
      globalObj: this.globalObj,
      toState,
      log,
      hashIdentity,
      walletProxy,
      file,
      explainer,
      CanisterStatus,
      DelegationChain,
      DelegationIdentity,
      Principal,
      AccountIdentifier,
      SubAccount,
      encodeIcrcAccount,
      decodeIcrcAccount,
      readDir,
      readFile,
      readFileText,
      writeFile,
      writeFileText,
    };
    // console.log(params);

    const resp = await modrun(params);
    if (resp !== undefined) log(resp);
    return logged;
  }

  private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
    const execution = this._controller.createNotebookCellExecution(cell);

    execution.executionOrder = ++this._executionOrder;
    execution.start(Date.now());

    try {
      const output = await this.run(cell);

      const rawStr = JSON.stringify(output, undefined, "  ");

      execution.replaceOutput([
        new vscode.NotebookCellOutput(
          [vscode.NotebookCellOutputItem.text(rawStr, "text/x-json")]
          // [vscode.NotebookCellOutputItem.json(output)]

          // output.map((x) => vscode.NotebookCellOutputItem.json(x))
          // vscode.NotebookCellOutputItem.text(rawStr, "text/x-json"),
        ),
      ]);

      execution.end(true, Date.now());
    } catch (err) {
      let derr = err;
      if (!(err instanceof Error)) {
        derr = new Error(JSON.stringify(err));
      }
      execution.replaceOutput([
        new vscode.NotebookCellOutput([
          vscode.NotebookCellOutputItem.error(derr as Error),
        ]),
      ]);
      execution.end(false, Date.now());
    }
  }
}

export const bigIntToString = (x: any): any => {
  if (x === undefined || x === null) return x;
  if (typeof x === "bigint") return x.toString() + "n";
  if (x instanceof Uint8Array) return x;
  if (x instanceof Uint16Array) return x;
  if (x instanceof Int16Array) return x;
  if (x instanceof Uint32Array) return x;
  if (x instanceof Int32Array) return x;
  if (x instanceof BigInt64Array)
    return Array.from(x, (bigInt) => bigInt.toString() + "n");
  if (x instanceof BigUint64Array)
    return Array.from(x, (bigInt) => bigInt.toString() + "n");

  if (Array.isArray(x)) {
    return x.map((y) => bigIntToString(y));
  }

  if (typeof x === "object") {
    return Object.fromEntries(
      Object.keys(x).map((k) => {
        return [k, bigIntToString(x[k])];
      })
    );
  }
  return x;
};
