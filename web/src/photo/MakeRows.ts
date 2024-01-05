import { isEqualDay, isEqualMonth, toDayStart, toMonthStart } from "../lib/date";
import { AlbumPhoto, AlbumRow, RowKind } from "./AlbumPhoto";
import { getDuplicateBucket } from "./PhotoStore";

/**
 * split photo array into rows
 * we want to take N pictures so total width == width and height is
 * less then max. The obvious solution is to render one photo on a row
 * but there is no fun in that
 * 
 * The algorithm is actually simple. We first take first pho
 */
export function makeRows(photos: ReadonlyArray<AlbumPhoto>,
  options: {
    optimalHeight: number,
    targetWidth: number,
    padding: number,
    startNewRow?: (photo: AlbumPhoto, idx: number, photos: ReadonlyArray<AlbumPhoto>) => AlbumRow[] | null
  }): AlbumRow[] {
  let row: AlbumPhoto[] = [];
  let prevHeight = 0;
  let rows: AlbumRow[] = [];
  let maxHeight = Math.round(options.optimalHeight * 1.3);
  let height = Number.MAX_SAFE_INTEGER;
  for (let idx = 0; idx < photos.length; idx++) {
    let photo = photos[idx];
    if (photo.height === 0) {
      continue;
    }

    // if (photo.dupCount > 1) {
    //   let ids = getDuplicateBucket(photo);
    //   if (photo.wire.id !== ids[0]) {
    //     continue;
    //   }
    // }

    if (options.startNewRow) {
      let startRows = options.startNewRow(photo, idx, photos);
      if (startRows) {
        if (row.length > 0) {
          rows.push(enforceMaxHeight({
            kind: RowKind.photos,
            height: height,
            padding: options.padding,
            photos: row,
          }, maxHeight));
        }

        rows.push(...startRows);

        row = [];
        height = Number.MAX_SAFE_INTEGER;
      }
    }

    prevHeight = height;
    row.push(photo);

    height = computeRowHeight(row, options.targetWidth, options.padding);
    if (Math.abs(options.optimalHeight - prevHeight) < Math.abs(options.optimalHeight - height)) {
      rows.push(enforceMaxHeight({
        kind: RowKind.photos,
        height: height,
        padding: options.padding,
        photos: row.slice(0, row.length - 1),
      }, maxHeight));
      row = [];
      // add last element back
      row.push(photo);
      height = computeRowHeight(row, options.targetWidth, options.padding);
    }
  }

  if (row.length > 0) {
    rows.push(enforceMaxHeight({
      kind: RowKind.photos,
      height: height,
      padding: options.padding,
      photos: row,
    }, maxHeight));
  }

  return rows;
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

export function makeByMonthRows(photos: ReadonlyArray<AlbumPhoto>, targetWidth: number, padding: number): AlbumRow[] {
  let currentMonth: Date | null = null;

  let rows = makeRows(photos, {
    optimalHeight: 200,
    targetWidth: targetWidth,
    padding: padding,
    startNewRow: (photo: AlbumPhoto, idx: number, photos: ReadonlyArray<AlbumPhoto>) => {
      if (idx !== 0) {
        let d1 = photos[idx - 1].originalDate;
        let d2 = photo.originalDate;
        if (isEqualDay(d1, d2)) {
          return null;
        }
      }

      let rows: AlbumRow[] = [];
      if (currentMonth === null || !isEqualMonth(currentMonth, photo.originalDate)) {
        rows.push({
          kind: RowKind.month,
          dt: toMonthStart(photo.originalDate),
          height: 0,
          padding: 0
        });
        currentMonth = photo.originalDate;
      }

      rows.push({
        kind: RowKind.day,
        dt: toDayStart(photo.originalDate),
        height: 0,
        padding: 0
      });

      return rows;
    }
  });

  return rows;
}
