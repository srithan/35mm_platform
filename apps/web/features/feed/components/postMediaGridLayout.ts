export function postMediaGridCellClassName(
  count: number,
  index: number,
): string {
  if (count === 2) {
    return "aspect-[4/5]";
  }
  if (count === 4) {
    return "aspect-[4/3]";
  }
  if (count === 3 && index === 0) {
    return "col-span-2 aspect-[2/1]";
  }
  if (count === 3) {
    return "aspect-square";
  }
  return "aspect-[4/3]";
}
