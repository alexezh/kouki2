import { AlbumPhoto, PhotoListId } from "./AlbumPhoto";
import { wireGetCollection } from "../lib/photoclient";
import { SimpleEventSource } from "../lib/synceventsource";

/**
 * arbitrary collection of AlbumPhotos backed by either folder or collection
 * photos do not have to be unique. In quick collection, we might have a lot
 * grouped by add time
 */
export class PhotoList {
  private readonly _photos: AlbumPhoto[] = [];
  private readonly onChanged: SimpleEventSource = new SimpleEventSource();
  public readonly id: PhotoListId;

  public get photos(): ReadonlyArray<AlbumPhoto> {
    return this._photos;
  }

  public get photoCount(): number { return this._photos.length }

  public constructor(id: PhotoListId, photos: AlbumPhoto[]) {
    this.id = id;
    this._photos = photos;
  }

  public addPhotos(photos: IterableIterator<AlbumPhoto>) {
    this._photos.push(...photos);
    this.onChanged.invoke();
  }

  public addOnChanged(func: () => void): number {
    return this.onChanged.add(func);
  }

  public removeOnChanged(id: number) {
    return this.onChanged.remove(id);
  }

  public findIndex(pred: (x: AlbumPhoto) => boolean): number {
    return this._photos.findIndex(pred);
  }

  public filter(pred: (x: AlbumPhoto) => boolean): AlbumPhoto[] {
    return this.photos.filter(pred);
  }
}

let photoMap = new Map<number, AlbumPhoto>();
let duplicateByHashBuckets = new Map<string, number[]>();
let loaded = false;
let photoLists = new Map<string, PhotoList>();

export async function loadLibrary() {
  if (loaded) {
    return;
  }
  let wirePhotos = await wireGetCollection("all");

  for (let wirePhoto of wirePhotos) {
    let photo = photoMap.get(wirePhoto.id);
    if (photo) {
      ;
    } else {
      photo = new AlbumPhoto(wirePhoto);
      photoMap.set(wirePhoto.id, photo);
    }
  }

  buildDuplicateBuckets();
  loaded = true;
}

/**
 * this is a ever going question on storage vs runtime
 * for now we are going to do runtime because it is cheaper
 * 
 * for dupes, we are going to store hash and signature
 * in this function we are first going to first get photos which are dupes
 * and then choose which one is good. 
 */
function buildDuplicateBuckets() {
  // make list of dupes by hash; we will also make list by signature
  duplicateByHashBuckets.clear();
  for (let [key, photo] of photoMap) {
    let ids = duplicateByHashBuckets.get(photo.wire.hash);
    if (ids) {
      ids.push(photo.wire.id);
    } else {
      duplicateByHashBuckets.set(photo.wire.hash, [photo.wire.id]);
    }
  }

  for (let [key, photo] of photoMap) {
    let ids = duplicateByHashBuckets.get(photo.wire.hash);
    photo.dupCount = ids!.length;
  }
}

function filterPhotos(photos: Map<number, AlbumPhoto> | ReadonlyArray<AlbumPhoto>, pred: (x: AlbumPhoto) => boolean): AlbumPhoto[] {
  let filtered: AlbumPhoto[] = [];
  if (Array.isArray(photos)) {
    for (let photo of (photos as AlbumPhoto[])) {
      if (pred(photo)) {
        filtered.push(photo);
      }
    }
  } else {
    for (let [key, photo] of (photos as Map<number, AlbumPhoto>)) {
      if (pred(photo)) {
        filtered.push(photo);
      }
    }
  }

  return filtered;
}

function sortByDate(photos: AlbumPhoto[]): void {
  photos.sort((x: AlbumPhoto, y: AlbumPhoto) => {
    let xn = x.originalDate.valueOf();
    let yn = y.originalDate.valueOf();
    if (xn > yn) {
      return -1;
    } else if (xn < yn) {
      return 1;
    } else {
      return 0;
    }
  })
}

export function getDuplicateBucket(photo: AlbumPhoto): number[] {
  let ids = duplicateByHashBuckets.get(photo.wire.hash);
  return ids ?? [photo.wire.id];
}

/**
 * it is easier for us to keep lists and invalidate them as we go
 */
export async function loadPhotoList(id: PhotoListId, pred?: (x: AlbumPhoto) => boolean): Promise<PhotoList> {
  await loadLibrary();

  let cachedList = photoLists.get(id.toString());
  if (!cachedList) {
    cachedList = makeList(id);
    photoLists.set(id.toString(), cachedList);
  }

  if (pred) {
    cachedList = new PhotoList(id, filterPhotos(cachedList.photos, pred));
  }

  return cachedList;
}

function makeList(id: PhotoListId): PhotoList {
  if (id.kind === 'folder') {
    let folderPhotos = filterPhotos(photoMap, (x: AlbumPhoto) => { return x.wire.folderId === id.id })
    sortByDate(folderPhotos);

    return new PhotoList(id, folderPhotos);
  } else if (id.kind === 'all') {
    let dupPhotos = new Map<number, boolean>();
    let allPhotos = filterPhotos(photoMap, (x: AlbumPhoto) => {

      // ensure that we only have one photo in collection
      if (x.dupCount > 1) {
        let isDup = dupPhotos.get(x.wire.id);
        if (isDup) {
          return false;
        }

        let ids = getDuplicateBucket(x);
        for (let id of ids) {
          dupPhotos.set(id, true);
        }
      }

      return true;
    });
    sortByDate(allPhotos);
    return new PhotoList(id, allPhotos);
  } else if (id.kind === 'quick') {
    let qc = photoLists.get("quick");
    if (!qc) {
      qc = new PhotoList(new PhotoListId('quick', 0), []);
      photoLists.set("quick", qc);
    }
    return qc;
  } else {
    return new PhotoList(id, []);
  }
}

export function getPhotoById(id: number): AlbumPhoto | undefined {
  return photoMap.get(id);
}

export async function getPhotoListSize(id: PhotoListId): Promise<number> {
  let list = await loadPhotoList(id);
  return list.photos.length;
}

export function getQuickCollection(): PhotoList {
  let qc = photoLists.get("quick");
  if (!qc) {
    qc = new PhotoList(new PhotoListId('quick', 0), []);
    photoLists.set("quick", qc);
  }
  return qc;
}

export function addQuickCollection(photos: IterableIterator<AlbumPhoto>) {

  getQuickCollection().addPhotos(photos);
}