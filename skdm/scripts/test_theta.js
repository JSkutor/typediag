const fs = require("fs");
const thetaOrderJson = JSON.parse(fs.readFileSync("./src/lib/skdm/theta_order.json", "utf8"));
function getTheta(centerKey, fromKey) {
  const center = centerKey.toLowerCase();
  const from = fromKey.toLowerCase();
  const order = thetaOrderJson[center];
  if (!order) return 0;
  const idx = order.indexOf(from);
  if (idx === -1) return 0;
  return (idx / 25) * 2 * Math.PI;
}
console.log(getTheta("q", "w"), getTheta("q", "e"), getTheta("q", "p"));
