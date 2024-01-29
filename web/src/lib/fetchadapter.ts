
export interface IFetchAdapter {
  get(uri: string): Promise<Response>;
  post(uri: string, body?: string): Promise<any>
  postBuffer(uri: string, body?: ArrayBuffer): Promise<any>
  putFile(url: string, fileName: string, contentType: string): Promise<{ status: number, responseText: string | null }>;
}

export let fetchAdapter: IFetchAdapter | undefined = undefined;
let sessionId: string | undefined;

export function getSessionId(): string | undefined {
  return sessionId;
}

export function setSessionId(id: string) {
  sessionId = id;
}

export function setFetchAdapter(adapter: IFetchAdapter) {
  fetchAdapter = adapter;
}

// get static resource
export async function fetchResource(url: string): Promise<ArrayBuffer> {
  return await (await (await fetchAdapter!.get(url)).blob()).arrayBuffer();
}

export type ResultResponse = {
  result: 'Ok' | 'Done' | 'Failed' | 'NotFound' | 'Processing';
  message: string;
}

