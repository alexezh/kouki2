import { AlbumPhoto, CatalogId } from "./AlbumPhoto";
import { WirePhotoEntry, wireGetCollection, wireGetFolder } from "../lib/fetchadapter";

let photoMap = new Map<number, AlbumPhoto>();
let duplicateByHashBuckets = new Map<string, number[]>();
let loaded = false;

async function loadLibrary() {
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

function filterPhotos(photos: Map<number, AlbumPhoto>, pred: (x: AlbumPhoto) => boolean) {
  let filtered: AlbumPhoto[] = [];
  for (let [key, photo] of photos) {
    if (pred(photo)) {
      filtered.push(photo);
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

export async function loadFolder(folderId: number): Promise<AlbumPhoto[]> {
  await loadLibrary();
  let folderPhotos = filterPhotos(photoMap, (x: AlbumPhoto) => { return x.wire.folderId === folderId })
  sortByDate(folderPhotos);

  return folderPhotos;
}

export async function loadCollection(id: CatalogId): Promise<AlbumPhoto[]> {
  await loadLibrary();

  if (id === 'all') {
    let folderPhotos = filterPhotos(photoMap, (x: AlbumPhoto) => { return true })
    sortByDate(folderPhotos);
    return folderPhotos;
  } else if (id === 'dups') {
    let folderPhotos = filterPhotos(photoMap, (x: AlbumPhoto) => { return x.dupCount > 1 })
    sortByDate(folderPhotos);
    return folderPhotos;
  } else {
    return [];
  }
}

export function getPhotoById(id: number): AlbumPhoto | undefined {
  return photoMap.get(id);
}

