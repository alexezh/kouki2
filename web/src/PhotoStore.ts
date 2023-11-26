import { wireGetPhotos } from "./lib/fetchadapter";
import { Photo, Image } from "react-photo-album";

export async function loadPhotos(): Promise<Photo[]> {
  let wphotos = await wireGetPhotos(1);
  let photos: Photo[] = [];
  for (let wp of wphotos) {
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
