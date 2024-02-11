/**
 * Returns a hash code from a string
 * @param  {String} str The string to hash.
 * @return {Number}    A 32bit integer
 * @see http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 */
export function hashString(hash: number, str: string) {
  for (let i = 0, len = str.length; i < len; i++) {
    let chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

export function hashInt52(hash: number, val: number) {
  let c1 = (val & 0xffff);
  hash = (hash << 5) - hash + c1;
  hash |= 0; // Convert to 32bit integer

  let c2 = (val >> 16) & 0xffff;
  hash = (hash << 5) - hash + c2;
  hash |= 0; // Convert to 32bit integer

  let c3 = (val >> 32) & 0xffff;
  hash = (hash << 5) - hash + c3;
  hash |= 0; // Convert to 32bit integer

  let c4 = (val >> 48) & 0x7;
  hash = (hash << 5) - hash + c4;
  hash |= 0; // Convert to 32bit integer

  return hash;
}