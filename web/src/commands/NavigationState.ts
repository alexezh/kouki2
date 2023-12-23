import { AlbumPhoto, CatalogId, FolderId, PhotoListId } from "../photo/PhotoStore";
import { SimpleEventSource } from "../lib/synceventsource";

let currentListId: PhotoListId = 'all';
let currentList: AlbumPhoto[];
let currentListChanged = new SimpleEventSource();

export function addOnListChanged(func: () => void): number {
  return currentListChanged.add(func);
}

export function removeOnListChanged(id: number) {
  currentListChanged.remove(id);
}

export function getCurrentList(): AlbumPhoto[] {
  return currentList;
}

export function getCurrentListId(): PhotoListId {
  return currentListId;
}

export function setCurrentList(id: PhotoListId, photos: AlbumPhoto[]) {
  currentListId = id;
  currentList = photos;
  currentListChanged.invoke();
}