import { AlbumPhoto, AlbumRow } from "./AlbumPhoto";
import { getDuplicateBucket } from "./PhotoStore";

/**
 * split photo array into rows
 * we want to take N pictures so total width == width and height is
 * less then max. The obvious solution is to render one photo on a row
 * but there is no fun in that
 * 
 * The algorithm is actually simple. We first take first pho
 */
export function makeRows(photos: AlbumPhoto[],
  options: {
    optimalHeight: number,
    targetWidth: number,
    padding: number,
    startNewRow?: (photo: AlbumPhoto, idx: number, photos: AlbumPhoto[]) => { headerRow: AlbumRow } | null
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

    if (photo.dupCount > 1) {
      let ids = getDuplicateBucket(photo);
      if (photo.wire.id !== ids[0]) {
        continue;
      }
    }

    if (options.startNewRow) {
      let startRow = options.startNewRow(photo, idx, photos);
      if (startRow) {
        if (row.length > 0) {
          rows.push(enforceMaxHeight({
            height: height,
            padding: options.padding,
            photos: row,
          }, maxHeight));
        }

        if (startRow.headerRow) {
          rows.push(startRow.headerRow);
        }

        row = [];
        height = Number.MAX_SAFE_INTEGER;
      }
    }

    prevHeight = height;
    row.push(photo);

    height = computeRowHeight(row, options.targetWidth, options.padding);
    if (Math.abs(options.optimalHeight - prevHeight) < Math.abs(options.optimalHeight - height)) {
      rows.push(enforceMaxHeight({
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