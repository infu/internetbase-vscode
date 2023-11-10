const fs = require("fs");

// Read the contents of index.html
fs.readFile("build/index.html", "utf8", (err, data) => {
  if (err) {
    console.error(err);
    return;
  }

  // Write the contents to index.html.js
  fs.writeFile(
    "build/index.html.js",
    `export const html = ${JSON.stringify(data)}`,
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log("index.html.json generated.");
    }
  );
});
