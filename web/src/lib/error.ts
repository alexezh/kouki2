export function catchAll(func: () => void) {
  try {
    func();
  }
  catch (e: any) {
    console.error("Exception:" + e.toString());
  }
}

export async function catchAllAsync(func: () => Promise<any>) {
  try {
    await func();
  }
  catch (e: any) {
    console.error("Exception:" + e.toString());
  }
}