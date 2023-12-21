import { useEffect, useState } from "react";
import { selectionManager } from "../commands/SelectionManager";
import { AlbumPhoto } from "./PhotoStore";

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
  props.push({ name: 'Date:', value: photo.wire.originalDateTime });
  if (photo.wire.imageId) {
    props.push({ name: 'ImageId:', value: photo.wire.imageId });
  }

  return props;
}

export function PhotoInfo() {
  let [currentPhoto, setCurrentPhoto] = useState<AlbumPhoto | null>(null);

  useEffect(() => {
    let idSelected = selectionManager.addOnAnySelected((x: AlbumPhoto, selected: boolean) => {
      setCurrentPhoto(x);
    })
    return () => {
      selectionManager.removeOnAnySelected(idSelected);
    }
  })

  return (
    <div className="PhotoInfo">
      {getProperties(currentPhoto).map((x) => (<div>{x.name + x.value}</div>))}
    </div>
  );
};