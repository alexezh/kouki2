import { AlbumPhoto, AlbumRow, PhotoListId } from "../photo/AlbumPhoto";
import { SimpleEventSource } from "../lib/synceventsource";
import { selectionManager } from "./SelectionManager";
import { PhotoList } from "../photo/PhotoList";
import { loadPhotoList } from "../photo/LoadPhotoList";

export type FilterFavorite = "all" | "favorite" | "rejected";

export interface AppState {
  readonly viewMode: ViewMode;
  readonly currentListId: PhotoListId;
  readonly currentList: PhotoList;
  readonly filterFavorite: FilterFavorite;
  readonly filterDups: boolean;
  readonly filterStars: number;
  readonly rows: AlbumRow[] | null;
  readonly years: YearEntry[];
  readonly viewDate?: { year: number, month: number };

  readonly dayRowHeight: number;
  readonly monthRowHeight: number;
}

export type AppStateUpdate = {
  viewMode?: ViewMode;
  currentListId?: PhotoListId;
  filterFavorite?: FilterFavorite;
  filterDups?: boolean;
  filterStars?: number;
  rows?: AlbumRow[];
  viewDate?: { year: number, month: number }
  dayRowHeight?: number;
  monthRowHeight?: number;
}

export type MonthEntry = {
  month: string;
}

export type YearEntry = {
  year: number;
  months: number[];
}

export enum ViewMode {
  measure,
  grid,
  zoom
}

let state: AppState & {
  // change id from List.onChange
  listChangeId: number
} = {
  viewMode: ViewMode.measure,
  currentListId: new PhotoListId("unknown", 0),
  currentList: new PhotoList(new PhotoListId('unknown', 0), () => Promise.resolve([])),
  listChangeId: 0,
  filterFavorite: "all",
  filterDups: false,
  filterStars: 0,
  rows: null,
  years: [],
  dayRowHeight: 0,
  monthRowHeight: 0
}

let initialized = false;
let stateChanged = new SimpleEventSource();

export function addOnStateChanged(func: () => void): number {
  return stateChanged.add(func);
}

export function removeOnStateChanged(id: number) {
  stateChanged.remove(id);
}

export function getState(): AppState {
  return state;
}

export function updateState(update: AppStateUpdate) {
  let rebuildList = false;

  if (!initialized) {
    initialized = true;
    rebuildList = true;
  }

  if (update.currentListId) {
    console.log("set folder id:" + update.currentListId);
  }
  if (update.currentListId && state.currentListId !== update.currentListId) {
    rebuildList = true;
  }

  if (update.filterFavorite && state.filterFavorite !== update.filterFavorite) {
    rebuildList = true;
  }

  if (update.filterDups !== undefined && state.filterDups !== update.filterDups) {
    rebuildList = true;
  }

  for (let x of Object.keys(update)) {
    // @ts-ignore
    state[x] = update[x];
  }

  if (rebuildList) {
    setTimeout(async () => {
      let photos: PhotoList = await loadPhotoList(state.currentListId);

      photos.setFilter((x: AlbumPhoto) => {
        if (state.filterFavorite === 'favorite' && x.favorite <= 0) {
          return false;
        }
        else if (state.filterFavorite === 'rejected' && x.favorite >= 0) {
          return false;
        }

        if (state.filterDups && x.dupCount < 2) {
          return false;
        }

        return true;
      });

      if (state.currentList) {
        state.currentList.removeOnChanged(state.listChangeId);
      }
      (state as any).currentList = photos;
      state.listChangeId = state.currentList.addOnChanged(() => {
        console.log('Update current collection: ' + state.currentList.photoCount);
        // reset rows so layout code can regenerate
        (state as any).rows = null;
        stateChanged.invoke();
      });

      (state as any).years = buildYears(photos.photos);
      (state as any).rows = null;
      selectionManager.clear();
      stateChanged.invoke();
    })
  } else {
    stateChanged.invoke();
  }
}

function buildYears(photos: ReadonlyArray<AlbumPhoto>): YearEntry[] {
  let years: YearEntry[] = [];
  let yearMap = new Map<number, YearEntry>();

  // use months as index
  for (let photo of photos) {
    let month = photo.originalDate.getMonth();
    let yearVal = photo.originalDate.getFullYear();
    let year = yearMap.get(yearVal);
    if (!year) {
      year = { year: yearVal, months: [] }
      yearMap.set(yearVal, year);
    }
    year.months[month] = 1;
  }

  years = [...yearMap.values()];
  years.sort((x: YearEntry, y: YearEntry) => Math.sign(y.year - x.year));

  // update months to actual numbers
  for (let year of years) {
    let months: number[] = [];
    for (let idx = year.months.length; idx >= 0; idx--) {
      if (year.months[idx]) {
        months.push(idx);
      }
    }
    year.months = months;
  }

  return years;
}

export enum Command {
  ScrollAlbum = 1,
  SetFocusAlbum = 2
}

let commandHandler = new SimpleEventSource();

export function addCommandHandler(func: (cmd: Command, ...args: any[]) => void) {
  return commandHandler.add(func);
}

export function removeCommandHandler(id: number) {
  return commandHandler.remove(id);
}

/**
 * issues command to scroll
 */
export function scrollAlbumToDate(dt: { year: number, month: number }) {
  commandHandler.invoke(Command.ScrollAlbum, dt);
}

export function setFocusAlbum() {
  commandHandler.invoke(Command.SetFocusAlbum);
}
