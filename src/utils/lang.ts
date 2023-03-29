export const hasOwn = (o: any, k: string) =>
  Object.prototype.hasOwnProperty.call(o, k);

export const emptyCoalesce = <T1, T2>(a: T1, b: T2) => {
  if (isEmpty(a)) return b;
  return a;
};

export const isEmpty = (a: any): a is void | null | '' | never[] => {
  return a == null || a === '' || (Array.isArray(a) && a.length === 0);
};
