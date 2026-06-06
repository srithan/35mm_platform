export function formatImportCount(value: number) {
  if (value >= 1000) return (value / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(value);
}

export function posterGradient(seed: string) {
  var hash = 0;
  for (var i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) & 0xffffffff;
  }
  var hue = Math.abs(hash) % 360;
  return (
    "linear-gradient(145deg, hsl(" +
    hue +
    " 42% 28%), hsl(" +
    ((hue + 40) % 360) +
    " 55% 42%))"
  );
}
