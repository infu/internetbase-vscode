import React, { useState, useEffect } from "react";
import logo from "./logo.svg";
import "./App.css";
import { IDLExplorer } from "./IDLExplorer";
import icblast, { explainer } from "@infu/icblast";
import "@vscode/codicons/dist/codicon.css";
import { Box, Span, Icon, Text } from "./Prim";

function App() {
  const [id, setId] = useState("rrkah-fqaaa-aaaaa-aaaaq-cai");
  const [can, setCan] = useState(null);
  const [idlUrl, setIdlUrl] = useState("");
  const [host, setHost] = useState("");

  const inputRef = React.useRef(null);
  const idlRef = React.useRef(null);
  const hostRef = React.useRef(null);
  const [network, setNetwork] = useState("ic");
  const [err, setErr] = useState(null);
  const inputNetwork = React.useRef(null);
  const explore = async () => {
    setErr(null);
    try {
      let ic =
        network === "local"
          ? icblast({
              local: true,
              local_host: host.trim() !== "" ? host : undefined,
            })
          : icblast();

      let x = await ic(id, idlUrl.trim() !== "" ? idlUrl : undefined);
      let exp = explainer(x.$idlFactory);
      setCan({ can, exp });
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      explore();
    }, 1000);
    return () => clearTimeout(timer);
  }, [id, host, idlUrl, network]);

  return (
    <div className="App">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          explore();
        }}
      >
        <div style={{ display: "flex" }}>
          <select
            title="Select network"
            ref={inputNetwork}
            value={network}
            onChange={() => {
              setNetwork(inputNetwork.current.value);
            }}
            style={{ opacity: "0.6" }}
          >
            <option value="ic">ic</option>
            <option value="local">local</option>
          </select>
          <input
            placeholder="Enter canister id"
            type="text"
            style={{ width: "100%", paddingLeft: "10px" }}
            ref={inputRef}
            value={id}
            onChange={() => {
              setId(inputRef.current.value);
            }}
          />
        </div>

        <>
          <input
            title="Place URL of generated idl.js or .did (Candid) file here"
            placeholder="IDL URL"
            type="text"
            style={{ opacity: "0.6" }}
            ref={idlRef}
            value={idlUrl}
            onChange={() => {
              setIdlUrl(idlRef.current.value);
            }}
          />
          {network === "local" ? (
            <input
              title="The default for the local shared network is 127.0.0.1:4943, while for a project-specific network is 127.0.0.1:8000"
              placeholder="Host"
              type="text"
              style={{ opacity: "0.6" }}
              ref={hostRef}
              value={host}
              onChange={() => {
                setHost(hostRef.current.value);
              }}
            />
          ) : null}
        </>
      </form>
      <div>{err ? <div className="err">{err}</div> : null}</div>

      <div>{can ? <IDLExplorer tree={can.exp} /> : null}</div>
    </div>
  );
}

export default App;
