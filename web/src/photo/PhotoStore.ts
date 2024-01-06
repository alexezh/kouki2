import { AlbumPhoto, PhotoListId } from "./AlbumPhoto";
import { wireGetLibrary } from "../lib/photoclient";
import { SimpleEventSource } from "../lib/synceventsource";
import { PhotoList } from "./PhotoList";

let allPhotos: PhotoList | undefined;
export const photoLibraryMap = new Map<number, AlbumPhoto>();
const duplicateByHashBuckets = new Map<string, number[]>();
const photoLibraryChanged: SimpleEventSource = new SimpleEventSource();
const loadQueue: (() => Promise<any>)[] = [];
let loaded = false;

export function addOnPhotoLibraryChanged(func: () => void): number {
  return photoLibraryChanged.add(func);
}

export function removeOnPhotoLibraryChanged(id: number) {
  photoLibraryChanged.remove(id);
}

export function queueOnLoaded<T>(func: () => Promise<T>): Promise<T> {
  let promise = new Promise<T>((resolve) => {
    if (loaded) {
      setTimeout(async () => {
        let result = await func();
        resolve(result);
      });
    } else {
      loadQueue.push(async () => {
        let result = await func();
        resolve(result);
      });
    }
  });
  return promise;
}

function completeLoad() {
  loaded = true;

  setTimeout(async () => {
    for (let func of loadQueue) {
      await func();
    }

    // clear the queue
    loadQueue.splice(0, loadQueue.length);
  });
}

export async function loadLibrary(loadParts: () => Promise<boolean>) {
  if (loaded) {
    return;
  }
  let wirePhotos = await wireGetLibrary();

  for (let wirePhoto of wirePhotos) {
    let photo = photoLibraryMap.get(wirePhoto.id);
    if (photo) {
      ;
    } else {
      photo = new AlbumPhoto(wirePhoto);
      photoLibraryMap.set(wirePhoto.id, photo);
    }
  }

  buildDuplicateBuckets();

  await loadParts();

  completeLoad();
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
  for (let [key, photo] of photoLibraryMap) {
    let ids = duplicateByHashBuckets.get(photo.wire.hash);
    if (ids) {
      ids.push(photo.wire.id);
    } else {
      duplicateByHashBuckets.set(photo.wire.hash, [photo.wire.id]);
    }
  }

  for (let [key, photo] of photoLibraryMap) {
    let ids = duplicateByHashBuckets.get(photo.wire.hash);
    photo.dupCount = ids!.length;
  }
}

export function filterPhotos(photos: Map<number, AlbumPhoto> | ReadonlyArray<AlbumPhoto>, pred: (x: AlbumPhoto) => boolean): AlbumPhoto[] {
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

function filterUnique(photos: Map<number, AlbumPhoto> | ReadonlyArray<AlbumPhoto>): AlbumPhoto[] {
  // make list of non-duplicate photos while including at least one into collection
  let dupPhotos = new Map<number, boolean>();
  let uniquePhotos = filterPhotos(photos, (x: AlbumPhoto) => {

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

  return uniquePhotos;
}

export function sortByDate(photos: AlbumPhoto[]): void {
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

export function getPhotoById(id: number): AlbumPhoto | undefined {
  return photoLibraryMap.get(id);
}

export function getAllPhotos(): PhotoList {
  if (allPhotos) {
    return allPhotos;
  }

  allPhotos = new PhotoList(new PhotoListId('all', 0), () => {
    return queueOnLoaded((): Promise<AlbumPhoto[]> => {
      let uniquePhotos = filterUnique(photoLibraryMap);
      sortByDate(uniquePhotos);
      return Promise.resolve(uniquePhotos);
    });
  });

  return allPhotos;
}