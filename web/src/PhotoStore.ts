import { WireFolder, WirePhotoEntry, wireGetFolders, wireGetPhotos } from "./lib/fetchadapter";

export async function loadFolders(): Promise<WireFolder[]> {
  let folders = await wireGetFolders();
  return folders;
}

export type PhotoEntry = {
  width: number;
  height: number;
  scale: number;
  src: string;
  thumbnail: string;
}

export async function loadPhotos(folderId: number): Promise<Photo[]> {
  let wphotos = await wireGetPhotos(folderId);
  let photos: Photo[] = [];
  let i = 0;
  for (let wp of wphotos) {
    i++;
    if (i > 100) {
      break;
    }
    let srcSet: Image[] = [];

    let scale = wp.width / 256;

    srcSet.push({
      src: '/api/photolibrary/getimage/' + wp.hash,
      width: wp.width,
      height: wp.height
    });

    srcSet.push({
      src: '/api/photolibrary/getthumbnail/' + wp.hash,
      width: wp.width / scale,
      height: wp.height / scale
    });

    let pp: Photo = {
      src: '/api/photolibrary/getimage/' + wp.hash,
      width: wp.width,
      height: wp.height,
      srcSet: srcSet
    };

    photos.push(pp);
  }

  return photos;
}

type PhotoRow = {
  photos: PhotoEntry[];
  height: number;
}

/**
 * split photo array into rows
 * we want to take N pictures so total width == width and height is
 * less then max. The obvious solution is to render one photo on a row
 * but there is no fun in that
 * 
 * The algorithm is actually simple. We first take first pho
 */
export function makeRows(photos: WirePhotoEntry[], optimalHeight: number, targetWidth: number, padding: number): PhotoRow[] {
  let firstIdx = 0;
  let prevRow: PhotoEntry[] = [];
  let row: PhotoEntry[] = [];
  let height = Number.MAX_SAFE_INTEGER;
  let prevHeight = 0;
  let rows: PhotoRow[] = [];
  for (let photo of photos) {
    prevRow = row;
    prevHeight = height;
    row.push({
      width: photo.width,
      height: photo.height,
      scale: 1
    });

    height = computeRowHeight(row, targetWidth, padding);
    if (Math.abs(optimalHeight - prevHeight) < Math.abs(optimalHeight - height)) {
      rows.push({
        height: height,
        photos: prevRow,
      });
      row = [];
      height = Number.MAX_SAFE_INTEGER;
    }
  }

  return rows;
}

function computeRowHeight(row: PhotoEntry[], targetWidth: number, padding: number): number {
  // take the first photo and scale everything to it
  let height = row[0].height;
  let actualWidth = row[0].width;
  for (let i = 1; i < row.length; i++) {
    let p = row[i];
    p.scale = height / p.height;
    actualWidth += p.width * p.scale;
  }

  targetWidth -= padding * (row.length - 1);

  // now compute new scale
  let scale = targetWidth / actualWidth;
  for (let p of row) {
    p.scale *= scale;
  }

  return height * scale;
}