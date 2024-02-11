import { isEqualDay, isEqualMonth, toDayStart, toMonthStart } from "../lib/date";
import { AlbumPhoto, AlbumRow, RowKind } from "./AlbumPhoto";
import { PhotoList, PhotoListPos } from "./PhotoList";

/**
 * split photo array into rows
 * we want to take N pictures so total width == width and height is
 * less then max. The obvious solution is to render one photo on a row
 * but there is no fun in that
 * 
 * The algorithm is actually simple. We first take first pho
 */
export function* makeRows(photoList: PhotoList,
  options: {
    optimalHeight: number,
    targetWidth: number,
    padding: number,
    startNewRow?: (photo: AlbumPhoto, idx: PhotoListPos, photos: PhotoList) => AlbumRow[] | null
  }): IterableIterator<AlbumRow> {
  let row: AlbumPhoto[] = [];
  let prevHeight = 0;
  let maxHeight = Math.round(options.optimalHeight * 1.3);
  let height = Number.MAX_SAFE_INTEGER;

  for (let pos = photoList.getFirstPos(); pos !== -1; pos = photoList.getNext(pos)) {
    let photo = photoList.getItem(pos);

    if (options.startNewRow) {
      let startRows = options.startNewRow(photo, pos, photoList);
      if (startRows) {
        if (row.length > 0) {
          yield enforceMaxHeight({
            key: row[0].wire.hash,
            hash: 0,
            kind: RowKind.photos,
            height: height,
            padding: options.padding,
            photos: row,
          }, maxHeight);
        }

        for (let sr of startRows) {
          yield sr;
        }

        row = [];
        height = Number.MAX_SAFE_INTEGER;
      }
    }

    prevHeight = height;
    row.push(photo);

    height = computeRowHeight(row, options.targetWidth, options.padding);
    if (Math.abs(options.optimalHeight - prevHeight) < Math.abs(options.optimalHeight - height)) {
      yield enforceMaxHeight({
        key: row[0].wire.hash,
        hash: 0,
        kind: RowKind.photos,
        height: height,
        padding: options.padding,
        photos: row.slice(0, row.length - 1),
      }, maxHeight);
      row = [];
      row.push(photo);
      height = computeRowHeight(row, options.targetWidth, options.padding);
    }
  }

  if (row.length > 0) {
    yield enforceMaxHeight({
      key: row[0].wire.hash,
      hash: 0,
      kind: RowKind.photos,
      height: height,
      padding: options.padding,
      photos: row,
    }, maxHeight);
  }
}

function enforceMaxHeight(row: AlbumRow, maxHeight: number): AlbumRow {
  if (row.height > maxHeight) {
    for (let p of row.photos!) {
      p.scale = maxHeight / p.wire.height;
    }
    row.height = maxHeight;
  }

  return row;
}

function computeRowHeight(row: AlbumPhoto[], targetWidth: number, padding: number): number {
  // take the first photo and scale everything to it
  let height = row[0].height;
  let actualWidth = row[0].width;
  row[0].scale = 1;

  // figure out width scaled to first picture height
  for (let i = 1; i < row.length; i++) {
    let p = row[i];
    p.scale = height / p.height;
    actualWidth += p.width * p.scale;
  }

  // we want to add padding from both sides of picture
  targetWidth -= padding * row.length * 2;

  // now compute new scale
  let scale = targetWidth / actualWidth;
  for (let p of row) {
    p.scale *= scale;
  }

  return height * scale;
}

export function makeByMonthRows(photosList: PhotoList, targetWidth: number, padding: number): IterableIterator<AlbumRow> {
  let currentMonth: Date | null = null;

  return makeRows(photosList, {
    optimalHeight: 200,
    targetWidth: targetWidth,
    padding: padding,
    startNewRow: (photo: AlbumPhoto, idx: PhotoListPos, photos: PhotoList) => {
      try {
        let prevIdx = photos.getPrev(idx);
        if (prevIdx !== -1) {
          let d1 = photos.getItem(prevIdx).originalDate;
          let d2 = photo.originalDate;
          if (isEqualDay(d1, d2)) {
            return null;
          }
        }

        let rows: AlbumRow[] = [];
        if (currentMonth === null || !isEqualMonth(currentMonth, photo.originalDate)) {
          let month = toMonthStart(photo.originalDate);
          rows.push({
            key: 'month_' + month,
            hash: 0,
            kind: RowKind.month,
            dt: month,
            height: 0,
            padding: 0,
          });
          currentMonth = photo.originalDate;
        }

        let day = toDayStart(photo.originalDate);
        rows.push({
          key: 'day_' + day,
          hash: 0,
          kind: RowKind.day,
          dt: day,
          height: 0,
          padding: 0,
        });

        return rows;
      }
      catch (e: any) {
        console.error('startNewRow failed:' + e.toString());
        throw e;
      }
    }
  });
}

