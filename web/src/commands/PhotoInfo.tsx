import { useEffect, useState } from "react";
import { selectionManager } from "./SelectionManager";
import { AlbumPhoto, AlbumRow, FolderId } from "../photo/AlbumPhoto";
import { getDuplicateBucket, getPhotoById } from "../photo/PhotoStore";
import { getFolder } from "../photo/FolderStore";

function getProperties(photo: AlbumPhoto | null): { name: string, value: string }[] {
  if (!photo) {
    return [];
  }

  let props = [];
  props.push({ name: 'Name:', value: photo.getFileName() });
  props.push({ name: 'Date:', value: photo.wire.originalDateTime });
  props.push({ name: 'Width:', value: photo.wire.width.toString() });
  props.push({ name: 'Height:', value: photo.wire.height.toString() });
  props.push({ name: 'Size:', value: photo.wire.fileSize.toString() });
  props.push({ name: 'DupCount:', value: photo.dupCount.toString() });
  if (photo.wire.imageId) {
    props.push({ name: 'ImageId:', value: photo.wire.imageId });
  }
  if (photo.correlation) {
    props.push({ name: 'Corr:', value: photo.correlation.toString() });
  }

  //if (photo.dupCount > 1) {
  let ids = getDuplicateBucket(photo);
  for (let id of ids) {
    let dupPhoto = getPhotoById(id);
    let folder = getFolder(dupPhoto!.wire.folderId as FolderId)
    if (folder) {
      props.push({ name: 'Folder:', value: folder.path });
    }
  }
  //}

  return props;
}

export function PhotoInfo() {
  let [currentPhoto, setCurrentPhoto] = useState<AlbumPhoto | null>(null);

  useEffect(() => {
    let idSelected = selectionManager.addOnSelectionChanged(() => {
      if (selectionManager.lastSelectedPhoto) {
        setCurrentPhoto(selectionManager.lastSelectedPhoto);
      }
    })
    return () => {
      selectionManager.removeOnSelectionChanged(idSelected);
    }
  })

  return (
    <div className="PhotoInfo">
      {getProperties(currentPhoto).map((x) => (
        <div key={x.name} className="PhotoInfoItem">
          <div>{x.name}</div>
          <div className="PhotoInfoValue">{x.value}</div>
        </div>
      ))}
    </div>
  );
};