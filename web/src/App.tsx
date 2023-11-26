import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import PhotoAlbum, { Photo } from 'react-photo-album';
import { wireGetPhotos } from './lib/fetchadapter';

/*
const photos = [
  { src: "/api/photolibrary/getimage/11", width: 800, height: 600 },
  { src: "/api/photolibrary/getimage/image2.jpg", width: 1600, height: 900 },
];
*/

function App() {
  const [photos, setPhotos] = useState([] as Photo[]);

  setTimeout(async () => {
    let p = await wireGetPhotos(1);
    let pp: Photo = {
      src: '/api/photolibrary/getimage/' + p[0].Key,
      width: 800,
      height: 600
    }
    setPhotos([pp]);
  }, 0);

  return (
    <div className="App">
      return <PhotoAlbum layout="rows" photos={photos} />;
    </div>
  );
}

export default App;
