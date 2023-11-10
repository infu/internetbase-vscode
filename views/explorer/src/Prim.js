export const Box = ({ children, ...p }) => {
  return <div {...p}>{children}</div>;
};

export const Span = ({ children, ...p }) => {
  return <span {...p}>{children}</span>;
};

export const Icon = ({ name, style, className = "", ...p }) => {
  return (
    <i
      className={"codicon codicon-" + name + " " + className}
      style={{
        position: "relative",
        top: "3px",
        marginRight: "5px",
        marginLeft: "5px",
        cursor: p.onClick ? "pointer" : "default",
        ...style,
      }}
      {...p}
    />
  );
};

export const Text = ({ children, ...p }) => {
  return <span {...p}>{children}</span>;
};
