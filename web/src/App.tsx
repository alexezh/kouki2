import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    setTimeout(async () => {
      let wphotos = await wireGetPhotos(1);
      let pphotos: Photo[] = [];
      for (let photo of wphotos) {
        let pp: Photo = {
          src: '/api/photolibrary/getimage/' + photo.hash,
          width: 800,
          height: 600
        };
        pphotos.push(pp);
      }
      setPhotos(pphotos);
    });
    return () => {
      console.log('detach');
    };
  }, []);

  return (
    <div className="App">
      return <PhotoAlbum layout="rows" photos={photos} />;
    </div>
  );
}

export default App;
