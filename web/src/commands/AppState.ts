import { AlbumPhoto, AlbumRow, PhotoListId } from "../photo/AlbumPhoto";
import { SimpleEventSource } from "../lib/synceventsource";
import { loadPhotoList } from "../photo/PhotoStore";

export type FilterFavorite = "all" | "favorite" | "rejected";

export interface AppState {
  readonly currentListId: PhotoListId;
  readonly currentList: AlbumPhoto[];
  readonly filterFavorite: FilterFavorite;
  readonly filterStars: number;
  readonly rows: AlbumRow[] | null;
  readonly years: YearEntry[];
  readonly viewDate?: { year: number, month: number };
}

export type AppStateUpdate = {
  currentListId?: PhotoListId;
  filterFavorite?: FilterFavorite;
  filterStars?: number;
  rows?: AlbumRow[];
  viewDate?: { year: number, month: number }
}

export type MonthEntry = {
  month: string;
}

export type YearEntry = {
  year: number;
  months: number[];
}

let state: AppState = {
  currentListId: 'all',
  currentList: [],
  filterFavorite: "all",
  filterStars: 0,
  rows: null,
  years: []
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

  if (update.currentListId && state.currentListId !== update.currentListId) {
    rebuildList = true;
  }

  if (update.filterFavorite && state.filterFavorite !== update.filterFavorite) {
    rebuildList = true;
  }

  for (let x of Object.keys(update)) {
    // @ts-ignore
    state[x] = update[x];
  }

  if (rebuildList) {
    setTimeout(async () => {
      let photos = await loadPhotoList(state.currentListId, (x: AlbumPhoto) => {
        if (state.filterFavorite === 'favorite' && x.favorite <= 0) {
          return false;
        }
        else if (state.filterFavorite === 'rejected' && x.favorite >= 0) {
          return false;
        }

        return true;
      });

      // @ts-ignore
      state.currentList = photos;
      // @ts-ignore
      state.years = buildYears(photos);
      // @ts-ignore
      state.rows = null;
      stateChanged.invoke();
    })
  } else {
    stateChanged.invoke();
  }
}

function buildYears(photos: AlbumPhoto[]): YearEntry[] {
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
export function scrollAlbumToDate(dt: Date) {
  commandHandler.invoke(Command.ScrollAlbum, dt);
}
