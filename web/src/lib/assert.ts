export function assert(val: boolean, text: string) {
  if (val) {
    return;
  }
  console.log(text);
  debugger;
}