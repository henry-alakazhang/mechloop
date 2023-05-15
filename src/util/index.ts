export * from "./math";

export function isDefined<T>(t: T): t is NonNullable<T> {
  return t != undefined; // non eqeqeq means undefined and null
}
