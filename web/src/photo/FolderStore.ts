import { WireFolder, wireGetFolders } from "../lib/photoclient";
import { SimpleEventSource } from "../lib/synceventsource";
import { AlbumPhoto, FolderId, PhotoListId } from "./AlbumPhoto";
import { PhotoList } from "./PhotoList";
import { filterPhotos, photoLibraryMap, sortByDate } from "./PhotoStore";

export class PhotoFolder {
  public wire: WireFolder | null;

  /**
   * name relative to folder above 
   */
  public relname: string;
  public path: string;
  public children: PhotoFolder[] = [];

  public constructor(wire: WireFolder | null, relname: string, path: string) {
    this.wire = wire;
    this.relname = relname;
    this.path = path;
  }
}

let photoFolders: PhotoFolder[] = [];
let folderIdMap = new Map<FolderId, PhotoFolder>();
let folderChanged = new SimpleEventSource();
let folderLists = new Map<FolderId, PhotoList>();

export function addOnFoldersChanged(func: () => void): number {
  return folderChanged.add(func);
}

export function removeOnFoldersChanged(id: number) {
  return folderChanged.remove(id);
}

export function triggerRefreshFolders() {
  setTimeout(async () => {
    await loadFolders();
  });
}

function generatePhotoFolders(wireFolders: WireFolder[]): PhotoFolder[] {
  let folderMap = new Map<string, PhotoFolder>();
  let topFolders = new Map<string, PhotoFolder>();

  folderIdMap.clear();

  for (let wf of wireFolders) {
    let parts = wf.path.split(/[/\\]/);
    let path: string[] = [];
    let parent: PhotoFolder | null = null;

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
        af = new PhotoFolder((idx === parts.length - 1) ? wf : null, part, pathStr);
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
      af.children.sort((x: PhotoFolder, y: PhotoFolder) => { return x.relname.localeCompare(y.relname); })
    }
  }

  return [...topFolders.values()];
}

function pruneFolderChain(folders: PhotoFolder[]): PhotoFolder[] {
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

export function getFolder(id: FolderId): PhotoFolder | undefined {
  return folderIdMap.get(id);
}

export function getFolders(): PhotoFolder[] {
  return photoFolders;
}

export async function loadFolders(): Promise<PhotoFolder[]> {
  let wireFolders = await wireGetFolders();

  photoFolders = generatePhotoFolders(wireFolders);
  folderChanged.invoke();

  return photoFolders;
}

/**
 * filters all collection based on folder
 * can be called only after collection loaded; so we do not have to deal
 * with delay load
 */
export function getFolderList(folderId: PhotoListId): PhotoList {
  let folderList = folderLists.get(folderId.id as FolderId);
  if (folderList) {
    return folderList;
  }

  let folderPhotos = filterPhotos(photoLibraryMap, (x: AlbumPhoto) => { return x.wire.folderId === folderId.id })
  sortByDate(folderPhotos);

  folderList = new PhotoList(folderId, () => Promise.resolve(folderPhotos));
  folderLists.set(folderId.id as FolderId, folderList);

  return folderList;
}