import { AlbumPhoto, CatalogId, PhotoListId } from "./AlbumPhoto";
import { WirePhotoEntry, wireGetCollection, wireGetFolder } from "../lib/fetchadapter";

let photoMap = new Map<number, AlbumPhoto>();
let duplicateByHashBuckets = new Map<string, number[]>();
let loaded = false;
let photoLists = new Map<PhotoListId, AlbumPhoto[]>();

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

function filterPhotos(photos: Map<number, AlbumPhoto> | AlbumPhoto[], pred: (x: AlbumPhoto) => boolean) {
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
export async function loadPhotoList(id: PhotoListId, pred?: (x: AlbumPhoto) => boolean): Promise<AlbumPhoto[]> {
  await loadLibrary();

  let cachedList = photoLists.get(id);
  if (!cachedList) {
    cachedList = makeList(id);
    photoLists.set(id, cachedList);
  }

  if (pred) {
    cachedList = filterPhotos(cachedList, pred);
  }
  return cachedList;
}

function makeList(id: PhotoListId): AlbumPhoto[] {
  if (typeof (id) === "number") {
    let folderPhotos = filterPhotos(photoMap, (x: AlbumPhoto) => { return x.wire.folderId === id })
    sortByDate(folderPhotos);

    return folderPhotos;
  } else {
    if (id === 'all') {
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
      return allPhotos;
    } else if (id === 'dups') {
      let dupPhotos = filterPhotos(photoMap, (x: AlbumPhoto) => { return x.dupCount > 1 })
      sortByDate(dupPhotos);
      return dupPhotos;
    } else {
      return [];
    }
  }
}

export function getPhotoById(id: number): AlbumPhoto | undefined {
  return photoMap.get(id);
}

export async function getPhotoListSize(id: PhotoListId): Promise<number> {
  let list = await loadPhotoList(id);
  return list.length;
}