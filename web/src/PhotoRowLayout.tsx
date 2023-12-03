import { CSSProperties, useEffect, useState } from "react";
import { AlbumPhoto, AlbumRow } from "./PhotoStore";
import { PhotoLayout } from "./PhotoLayout";

export function PhotoRowLayout({ style, row }: { style: CSSProperties, row: AlbumRow }) {
  function onClick() {

  }
  function renderRow(row: AlbumRow) {
    let res = [];
    return row.photos.map((photo: AlbumPhoto, index: number) => {
      return (<PhotoLayout index={index} photo={photo} onClick={onClick} selected={false} margin={0} key={'photo_' + index}></PhotoLayout>)
    });
  }

  let rowStyle: React.CSSProperties = { ...style, display: 'flex', flexWrap: 'wrap', flexDirection: 'row' } as CSSProperties;

  return (
    <div style={rowStyle} >
      {renderRow(row)}
    </div>
  );
}
