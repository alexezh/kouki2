import { WireFolder, wireGetFolders } from "../lib/fetchadapter";
import { SimpleEventSource } from "../lib/synceventsource";
import { FolderId } from "./AlbumPhoto";

export function addOnFoldersChanged(func: () => void): number {
  return folderChanged.add(func);
}

export function removeOnFoldersChanged(id: number) {
  return folderChanged.remove(id);
}

export function triggerRefreshFolders() {
  folderChanged.invoke();
}

let folderChanged = new SimpleEventSource();

export class AlbumFolder {
  public wire: WireFolder | null;

  /**
   * name relative to folder above 
   */
  public relname: string;
  public path: string;
  public children: AlbumFolder[] = [];

  public constructor(wire: WireFolder | null, relname: string, path: string) {
    this.wire = wire;
    this.relname = relname;
    this.path = path;
  }
}

let albumFolders: AlbumFolder[] = [];
let folderIdMap = new Map<FolderId, AlbumFolder>();

function generateAlbumFolders(wireFolders: WireFolder[]): AlbumFolder[] {
  let folderMap = new Map<string, AlbumFolder>();
  let topFolders = new Map<string, AlbumFolder>();

  folderIdMap.clear();

  for (let wf of wireFolders) {
    let parts = wf.path.split(/[/\\]/);
    let path: string[] = [];
    let parent: AlbumFolder | null = null;

    // first build complete tree and then remove unnecessary nodes
    for (let idx = 0; idx < parts.length; idx++) {
      let part = parts[idx];

      // skip initial /; or any empty layers
      if (part.length === 0) {
        continue;
      }

      path.push(part);
      let pathStr = path.join('/');
      let af = folderMap.get(pathStr);
      if (!af) {
        af = new AlbumFolder((idx === parts.length - 1) ? wf : null, part, pathStr);
        folderMap.set(pathStr, af);
        if (parent) {
          parent.children.push(af);
        }

        if (wf) {
          folderIdMap.set(wf.id as FolderId, af);
        }

        if (path.length === 1) {
          topFolders.set(pathStr, af);
        }
      }
      parent = af;
    }
  }

  // remove unnecessary nodes
  for (let [key, af] of topFolders) {
    af.children = pruneFolderChain(af.children);
    if (af.children.length === 1) {
      topFolders.set(key, af.children[0]);
    }
  }

  for (let [key, af] of folderMap) {
    if (af.children.length > 1) {
      af.children.sort((x: AlbumFolder, y: AlbumFolder) => { return x.relname.localeCompare(y.relname); })
    }
  }

  return [...topFolders.values()];
}

function pruneFolderChain(folders: AlbumFolder[]): AlbumFolder[] {
  // if we have one item and it does not have wire, skip it
  if (folders.length === 1 && !folders[0].wire) {
    return pruneFolderChain(folders[0].children);
  }
  else {
    for (let af of folders) {
      af.children = pruneFolderChain(af.children);
    }

    return folders;
  }
}

export function getFolder(id: FolderId): AlbumFolder | undefined {
  return folderIdMap.get(id);
}

export async function loadFolders(): Promise<AlbumFolder[]> {
  let wireFolders = await wireGetFolders();

  albumFolders = generateAlbumFolders(wireFolders);
  return albumFolders;
}
