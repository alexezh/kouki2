import { CSSProperties, useEffect, useState } from "react";
import { AlbumPhoto, AlbumRow } from "./PhotoStore";
import { PhotoLayout } from "./PhotoLayout";

type PhotoRowLayoutProps = {
  style: CSSProperties,
  row: AlbumRow,
  onClick: (event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto) => void,
  onSelected: (event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto) => void
}
export function PhotoRowLayout(props: PhotoRowLayoutProps) {
  function renderRow(row: AlbumRow) {
    let res = [];
    return row.photos!.map((photo: AlbumPhoto, index: number) => {
      return (<PhotoLayout photo={photo} onClick={props.onClick} onSelected={props.onSelected} selected={false} margin={0} key={'photo_' + index}></PhotoLayout>)
    });
  }

  return (
    <div style={props.style} className="PhotoRow" >
      {renderRow(props.row)}
    </div>
  );
}

export function DayRowLayout(props: PhotoRowLayoutProps) {
  return (
    <div style={props.style} className="HeaderRow">
      {props.row.dt?.toLocaleDateString()}
    </div>
  );
}
