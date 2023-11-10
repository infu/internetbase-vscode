import React, { useState, useEffect } from "react";

import { actress } from "@infu/icblast";
import { Box, Span, Icon, Text } from "./Prim";

const vscode = window.acquireVsCodeApi ? window.acquireVsCodeApi() : null;

const clsToName = [
  [actress.xText, "Text"],
  [actress.xBigInt, "BigInt"],
  [actress.xNull, "null"],
  [actress.xPrincipal, "Principal"],
  [actress.xNat8, "Nat8"],
  [actress.xNat16, "Nat16"],
  [actress.xNat32, "Nat32"],
  [actress.xNat64, "Nat64"],
  [actress.xInt8, "Int8"],
  [actress.xInt16, "Int16"],
  [actress.xInt32, "Int32"],
  [actress.xInt64, "Int64"],
  [actress.xNat, "Nat"],
  [actress.xInt, "Int"],
  [actress.xTime, "Time"],
  [actress.xFloat, "Float"],
  [actress.xBool, "Bool"],
];

const Method = ({ k, expanded, setExpanded, tree }) => {
  const refInput = React.useRef(null);

  return (
    <Box>
      <Box
        className={"xmethod " + (expanded ? " selected" : "")}
        onClick={() => {
          setExpanded({ ...expanded, [k]: !expanded });
        }}
        style={{
          cursor: "pointer",
        }}
      >
        {expanded ? (
          <Icon name="chevron-down" />
        ) : (
          <Icon name="chevron-right" />
        )}

        <Text>{k}</Text>
      </Box>
      {expanded ? (
        <>
          <br />
          <span ref={refInput}>
            {k}
            <QueryBuilder obj={tree[k].input} />
          </span>
          <Icon
            className="active"
            name="insert"
            onClick={() => {
              var range = document.createRange();
              range.selectNode(refInput.current);
              window.getSelection().removeAllRanges(); // clear current selection
              window.getSelection().addRange(range); // to select text
              let value = window.getSelection().toString();
              value = value
                .replace(/✓/g, "")
                .replace(/^.*?\?[\,]*$/gm, "") // replace lines ending with ?
                .replace(/^\s*\n/gm, ""); // remove empty lines

              window.getSelection().removeAllRanges(); // to deselect

              vscode?.postMessage({
                type: "insertMethod",
                value,
              });
            }}
          />
          <br />
          <br />
          <hr />
          <br />
          <Text>{"output "}</Text>
          <QueryBuilder obj={tree[k].output} />
          <br />
          <br />
        </>
      ) : null}
    </Box>
  );
};

export const IDLExplorer = ({ tree }) => {
  let [expanded, setExpanded] = useState({});
  return (
    <Box>
      {Object.keys(tree).map((k, idx) => {
        return (
          <Method
            key={idx}
            k={k}
            expanded={expanded[k]}
            setExpanded={setExpanded}
            tree={tree}
          />
        );
      })}
    </Box>
  );
};

export const QueryBuilder = ({ obj }) => {
  return (
    <Span>
      <Val k="func" obj={obj} />
    </Span>
  );
};

export const Val = ({ obj, level = 1, depth = 0 }) => {
  let [selected, setSelected] = useState(false);
  if (depth > 30) return "...recursion...";
  if (!obj) return <Span>null</Span>;

  let pad = Array(level * 2)
    .fill(" ")
    .join("");

  if (obj instanceof actress.xTuple) {
    return (
      <Span>
        {"["}
        {obj.val.map((x, idx) => (
          <Span key={idx}>
            <br />
            {pad}
            <Span style={{ userSelect: "none" }}>{idx}:</Span>
            <Val key={idx} obj={x} level={level + 1} depth={depth + 1} />
            {idx !== obj.val.length - 1 && ", "}
          </Span>
        ))}
        {"]"}
      </Span>
    );
  }

  if (Array.isArray(obj)) {
    return (
      <Span>
        {"("}
        {obj.map((x, idx) => (
          <Span key={idx}>
            <Val k={idx} obj={obj[idx]} level={level} depth={depth + 1} />
            {idx !== obj.length - 1 && ", "}
          </Span>
        ))}
        {")"}
      </Span>
    );
  }

  if (obj instanceof actress.xVec) {
    return (
      <Span>
        <Text>[</Text>
        <Val obj={obj.val} level={level} depth={depth + 1} />
        <Text>]</Text>
      </Span>
    );
  }

  if (obj instanceof actress.xRecord) {
    return (
      <Span>
        <Text>{"{"}</Text>
        {Object.keys(obj.val).map((x, idx) => (
          <Span key={idx}>
            <br />
            {pad}

            <Span className="cfield">{x}:</Span>

            <Val key={x} obj={obj.val[x]} level={level + 1} depth={depth + 1} />
            {idx !== Object.keys(obj.val).length - 1 && <>,</>}
          </Span>
        ))}
        {Object.keys(obj.val).length ? (
          <>
            <br />
            {pad}
          </>
        ) : null}
        <Text>{"}"}</Text>
      </Span>
    );
  }

  if (obj instanceof actress.xOpt)
    return (
      <Span>
        <Span
          className="xopt"
          onClick={() => {
            setSelected(!selected);
          }}
        >
          {selected ? "✓" : "?"}
        </Span>
        {selected ? (
          <Val obj={obj.val} level={level} depth={depth + 1} />
        ) : null}
      </Span>
    );

  if (obj instanceof actress.xVariant) {
    return (
      <Span>
        <Text>{"{"}</Text>
        <select
          className="xvariant"
          style={{ userSelect: "none" }}
          onChange={(e) => {
            setSelected(e.target.value);
          }}
        >
          {Object.keys(obj.val).map((x, idx) => (
            <option key={idx} value={x}>
              {x}:
            </option>
          ))}
        </select>
        <span className="hidden-selectable">
          {(selected || Object.keys(obj.val)[0]) + ":"}
        </span>
        <Val
          obj={obj.val[selected || Object.keys(obj.val)[0]]}
          level={level}
          depth={depth + 1}
        />
        <Text>{"}"}</Text>
      </Span>
    );
  }

  if ("input" in obj) {
    return (
      <Span>
        <Text>{" func ("}</Text>
        <Val obj={obj.input} level={level + 1} depth={depth + 1} />
        <Text>{") => "}</Text>
        <Val obj={obj.output} level={level + 1} depth={depth + 1} />
      </Span>
    );
  }

  const clsName =
    typeof obj === "function"
      ? clsToName.find((x) => x[0] === obj)?.[1] || false
      : false;

  if (clsName) {
    return <Span className="ctype">{clsName}</Span>;
  }

  console.log("Uncought type", obj, typeof obj);

  return null;
};
