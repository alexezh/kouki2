import { WireCollection, WireFolderMetadata } from "../lib/photoclient";
import { SimpleEventSource } from "../lib/synceventsource";
import { AlbumPhoto, LibraryUpdateRecord, PhotoListId } from "./AlbumPhoto";
import { CollectionId, PhotoCollection, getCollectionsByKind, loadCollections } from "./CollectionStore";
import { AppFilter, IPhotoListSource, PhotoList } from "./PhotoList";
import { filterPhotos, loadLibrary, photoLibraryMap, sortByDate } from "./PhotoStore";

export class PhotoFolder {
  public readonly wire: WireFolderMetadata | null;
  public readonly id: PhotoListId;

  /**
   * name relative to folder above 
   */
  public relname: string;
  public path: string;
  public children: PhotoFolder[] = [];
  public get totalPhotos(): number { return (this.wire) ? this.wire.totalPhotos : 0 }

  public constructor(listId: PhotoListId, wire: WireFolderMetadata | null, relname: string, path: string) {
    this.id = listId;
    this.wire = wire;
    this.relname = relname;
    this.path = path;
  }
}

let photoFolders: PhotoFolder[] = [];
let folderIdMap = new Map<CollectionId, PhotoFolder>();
let folderChanged = new SimpleEventSource<void>();
let folderLists = new Map<CollectionId, PhotoList>();

export function addOnFoldersChanged(func: () => void): number {
  return folderChanged.add(func);
}

export function removeOnFoldersChanged(id: number) {
  return folderChanged.remove(id);
}

export function triggerRefreshFolders() {
  console.log('triggerRefreshFolders');

  setTimeout(async () => {
    await loadLibrary();
    return true;
  });
}

function generatePhotoFolders(colls: PhotoCollection[]): PhotoFolder[] {
  let folderMap = new Map<string, PhotoFolder>();
  let topFolders = new Map<string, PhotoFolder>();

  folderIdMap.clear();

  for (let coll of colls) {
    let wf = JSON.parse(coll.wire.metadata) as WireFolderMetadata;
    if (wf.path === null) {
      console.log('folder invalid');
      continue;
    }
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
        af = new PhotoFolder(coll.id, (idx === parts.length - 1) ? wf : null, part, pathStr);
        folderMap.set(pathStr, af);
        if (parent) {
          parent.children.push(af);
        }

        if (wf) {
          folderIdMap.set(coll.id.id, af);
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

export function getFolder(id: CollectionId): PhotoFolder | undefined {
  return folderIdMap.get(id);
}

export function getFolders(): PhotoFolder[] {
  return photoFolders;
}

export function loadFolders(): PhotoFolder[] {
  let colls = getCollectionsByKind('folder');

  photoFolders = generatePhotoFolders(colls);
  folderChanged.invoke();

  return photoFolders;
}

/**
 * filters all collection based on folder
 * can be called only after collection loaded; so we do not have to deal
 * with delay load
 */
export function getFolderList(folderId: PhotoListId): PhotoList {
  let folderList = folderLists.get(folderId.id);
  if (folderList) {
    return folderList;
  }

  let folderPhotos = filterPhotos(photoLibraryMap, (x: AlbumPhoto) => { return x.wire.folderId === folderId.id })
  sortByDate(folderPhotos);

  console.log('getFolderList: ' + folderPhotos.length);

  folderList = new PhotoList(folderId, new StaticPhotoSource(folderPhotos));
  folderLists.set(folderId.id, folderList);

  return folderList;
}

export class StaticPhotoSource implements IPhotoListSource {
  private photos: AlbumPhoto[];

  public constructor(photos: AlbumPhoto[]) {
    this.photos = photos;
  }

  addItems(items: AlbumPhoto | ReadonlyArray<AlbumPhoto>): void {
  }

  removeItems(items: AlbumPhoto | ReadonlyArray<AlbumPhoto>): void {
  }

  public isHidden(photo: AlbumPhoto): boolean {
    return false;
  }

  public setAppFilter(filter: AppFilter): void {

  }

  public setChangeHandler(func: (update: LibraryUpdateRecord[]) => void): void {
  }

  public getItems(): ReadonlyArray<AlbumPhoto> {
    return this.photos;
  }
}