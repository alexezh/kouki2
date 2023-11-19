import Queue from "queue";

type QueueItem = () => Promise<void>;
export class DispatchQueue {
  private items: QueueItem[] = [];
  private processing: boolean = false;

  public push(func: QueueItem) {
    this.items.push(func);
    this.tryRun();
  }

  private tryRun() {
    if (this.processing || this.items.length === 0) {
      return;
    }
    this.processing = true;
    setTimeout(async () => {
      let item = this.items.shift();
      await item!();

      this.processing = false;
      this.tryRun();
    });
  }
}

export interface IFetchAdapter {
  get(uri: string): Promise<Response>;
  post(uri: string, body?: string): Promise<any>
}

let fetchAdapter: IFetchAdapter | undefined = undefined;
let sessionId: string | undefined;
let projectId: string = '7fa84179-dc58-4939-8678-03370fd137f3';
let updateQueue: DispatchQueue = new DispatchQueue();

export function getSessionId(): string | undefined {
  return sessionId;
}

export function setSessionId(id: string) {
  sessionId = id;
}

export function setProjectId(id: string) {
  projectId = id;
}

export function getProjectId(): string {
  return projectId;
}

export function setFetchAdapter(adapter: IFetchAdapter) {
  fetchAdapter = adapter;
}

// get static resource
export async function fetchResource(url: string): Promise<ArrayBuffer> {
  return await (await (await fetchAdapter!.get(url)).blob()).arrayBuffer();
}

export type WirePhoto = {
  Id: number;
  Key: string;
  Name: string;
  Fav: boolean;
}

export type WireFolder = {
  Id: number;
  Path: string;
}

export async function wireGetFolders(): Promise<WireFolder[]> {
  let response = await (await fetchAdapter!.post(`/api/photolibrary/getfolders`));
  return response;
}


// export async function wireSetUserString(key: string, value: string): Promise<void> {
//   let request: WireString[] = [{ key: key, data: value }]
//   let requestData = JSON.stringify(request);
//   let res = await (await fetchAdapter!.post(`/api/user/setstrings/${sessionId}`, requestData)).json();
// }

