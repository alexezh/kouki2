import { EventHandler } from "react";
import { AlbumPhoto, AlbumRow, PhotoId, PhotoListId, RowKind } from "./AlbumPhoto";
import { PhotoList, PhotoListChangeType, PhotoListChangedArg, PhotoListPos } from "./PhotoList";
import { SimpleEventSource } from "../lib/synceventsource";
import { photoPadding } from "./AlbumLayout";
import { makeByMonthRows, makeFlatRows } from "./MakeRows";
import { hashInt52, hashString } from "../lib/hash";

export type RowCollectionChangedArg = {
  kind: "load" | "invalidate",
  list: PhotoList | null,
  invalidatePos?: number
};

export class RowCollection {
  private rowsIt: IterableIterator<AlbumRow> | null = null;
  /*
  * true if fully loaded
  */
  private loaded = false;
  private _photoList: PhotoList | null = null;
  private photoListChangedId: number = 0;
  private onChanged = new SimpleEventSource<RowCollectionChangedArg>();

  /**
   * map from id to row index
   */
  private _rowIndex: Map<PhotoId, number> = new Map<PhotoId, number>();
  private rows: AlbumRow[] = []
  private width: number = 0;
  private avgPhotosPerRow: number = 1;
  public version = 1;

  public get photoList(): PhotoList | null {
    return this._photoList;
  }

  public setRowWidth(width: number) {
    if (this.width === width) {
      return 0;
    }

    console.log('RowCollection:setRowWidth ' + width);
    this.width = width;
    this.resetRows();
    this.onChanged.invoke({ kind: "invalidate", list: this._photoList, invalidatePos: 0 });
  }

  public addOnChanged(func: (arg: RowCollectionChangedArg) => void): number {
    return this.onChanged.add(func);
  }

  public removeOnChanged(id: number) {
    return this.onChanged.remove(id);
  }

  public getRowCount(): number {
    if (this.loaded) {
      return this.rows.length;
    }
    else if (this.rows.length === 0 || this._photoList === null) {
      return 0;
    }
    else {
      return this._photoList.photoCount / this.avgPhotosPerRow;
    }
  }

  /**
   * find start position of a row
   */
  public findStartRowPos(pos: PhotoListPos): PhotoListPos {
    if (pos === -1 || this._photoList === null) {
      return -1 as PhotoListPos;
    }
    let rowIdx = this.getRowByPhoto(this._photoList.getItem(pos));
    let prevPos = pos;

    while (true) {
      pos = this._photoList.getPrev(pos);
      if (pos === -1) {
        return 0 as PhotoListPos;
      }

      if (this.getRowByPhoto(this._photoList.getItem(pos)) !== rowIdx) {
        return prevPos;
      }

      prevPos = pos;
    }
  }

  public getRowByPhoto(photo: AlbumPhoto): number {
    if (!photo) {
      return -1;
    }

    let row = this._rowIndex.get(photo.id)!;
    if (!row) {
      return -1;
    }

    return row;
  }

  public load(list: PhotoList) {
    console.log('RowCollection:load ' + list.id.toString())
    if (this.photoListChangedId !== 0) {
      this._photoList!.removeOnListChanged(this.photoListChangedId)
    }
    this._photoList = list;
    this.photoListChangedId = this._photoList.addOnListChanged(this.onListChanged.bind(this))
    if (this.width > 0) {
      this.resetRows();
    }
    this.onChanged.invoke({ kind: "load", list: this._photoList, invalidatePos: 0 });
  }

  private onListChanged(arg: PhotoListChangedArg) {
    // when list changes, we keep original and compare
    let oldRows = this.rows;
    let invalidatePos: number | undefined;
    this.resetRows();

    // if new list has fewer items; we reset for sure
    if (this.rows.length < oldRows.length) {
      invalidatePos = this.rows.length;
    }

    for (let i = 0, len = Math.min(oldRows.length, this.rows.length); i < len; i++) {
      if (oldRows[i].hash !== this.rows[i].hash) {
        invalidatePos = i;
        break;
      }
    }

    console.log('onListChanged:' + invalidatePos);
    this.onChanged.invoke({ kind: "invalidate", list: this._photoList, invalidatePos: invalidatePos });
  }

  private resetRows() {
    if (this._photoList?.filtered) {
      if (this._photoList.photoCount > 0) {
        console.log("resetRows:" + this._photoList.getItem(0 as PhotoListPos).id);
      }
      this.rowsIt = makeFlatRows(this._photoList!, this.width, photoPadding);
    } else {
      this.rowsIt = makeByMonthRows(this._photoList!, this.width, photoPadding);
    }
    this.loaded = false;
    this.version++;
    this._rowIndex.clear();
    this.rows = [];

    // load first N rows to get average
    this.getRow(40);

    let count = 0;
    for (let row of this.rows) {
      count += (row.kind === RowKind.photos) ? row.photos!.length : 0;
    }
    this.avgPhotosPerRow = count / this.rows.length;
  }

  public getRow(idx: number): AlbumRow | null {
    if (idx < this.rows.length) {
      return this.rows[idx];
    }

    if (this.loaded) {
      return null;
    }

    // load until index
    for (let i = this.rows.length; i <= idx; i++) {
      let res = this.rowsIt?.next();
      if (!res || res.done) {
        this.loaded = true;
        return null;
      }
      let row = res.value;
      if (row.kind === RowKind.photos) {
        let hash = 0;
        for (let photo of row.photos!) {
          this._rowIndex.set(photo.id, this.rows.length);
          hash = hashInt52(hash, photo.id);
        }
        row.hash = hash;
      } else {
        row.hash = hashString(0, row.key);
      }

      this.rows.push(row);
    }

    return this.rows[idx];
  }

  public findIndex(func: (row: AlbumRow) => boolean | undefined): number {
    for (let i = 0; ; i++) {
      let row = this.getRow(i);
      if (!row) {
        return -1;
      }
      if (func(row)) {
        return i;
      }
    }
  }
}

