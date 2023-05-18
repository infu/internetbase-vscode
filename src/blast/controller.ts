import * as vscode from "vscode";
// import "window-crypto";
// import "isomorphic-fetch";

import icblast, {
  toState,
  hashIdentity,
  walletProxy,
  file,
  explainer, // @ts-ignore
} from "@infu/icblast";

import { CanisterStatus } from "@dfinity/agent";

import {
  Ed25519KeyIdentity,
  DelegationChain,
  DelegationIdentity,
} from "@dfinity/identity";
import { Principal } from "@dfinity/principal";

import { BlastAuthenticationProvider } from "../auth/authProvider";

// import { AccountIdentifier, SubAccount } from "@dfinity/nns";

export class SampleKernel {
  private readonly _id = "blast-notebook-serializer-kernel";
  private readonly _label = "Blast JS Kernel";
  private readonly _supportedLanguages = ["javascript"];

  private _executionOrder = 0;
  private readonly _controller: vscode.NotebookController;
  public ic = null;
  public identity: Ed25519KeyIdentity | null = null;
  public globalObj = {};

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

  private async run(code: string): Promise<any[]> {
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
			SubAccount
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

    const rcode = `
		
async({
	icblast,
	identity,
	ic,
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
	SubAccount
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
      logged.push(toState(msg));
    };

    const global = (arg: object): void => {
      this.globalObj = { ...this.globalObj, ...arg };
    };

    const params = {
      icblast,
      identity: this.identity,
      ic: this.ic,
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
      // AccountIdentifier,
      // SubAccount,
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
      const output = await this.run(cell.document.getText());

      const rawStr = JSON.stringify(output, undefined, "  ");

      execution.replaceOutput([
        new vscode.NotebookCellOutput(
          output.map((x) => vscode.NotebookCellOutputItem.json(x))
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
