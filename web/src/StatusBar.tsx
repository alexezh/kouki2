import AppBar from '@mui/material/AppBar/AppBar';
import Toolbar from '@mui/material/Toolbar/Toolbar';
import IconButton from '@mui/material/IconButton/IconButton';
import Typography from '@mui/material/Typography/Typography';
import Button from '@mui/material/Button/Button';
import Icon from '@mui/material/Icon/Icon';
import { useEffect, useState } from 'react';
import { AlbumPhoto } from './PhotoStore';
import { selectionManager } from './SelectionManager';

const thumbsUp = (
  <Icon>
    <img className='StatusBarIcon' src="./assets/thumbs-up.svg" width='100%' height='100%' />
  </Icon >);

const thumbsUpFill = (
  <Icon>
    <img className='StatusBarIcon' src="./assets/thumbs-up-fill.svg" width='100%' height='100%' />
  </Icon >);

const thumbsDown = (
  <Icon>
    <img className='StatusBarIcon' src="./assets/thumbs-down.svg" />
  </Icon >);

const thumbsDownFill = (
  <Icon>
    <img className='StatusBarIcon' src="./assets/thumbs-down-fill.svg" width='100%' height='100%' />
  </Icon >);

function computeAggregatedFavs(): number {
  let fav: number = 0;
  let unfav: number = 0;
  let none: number = 0;

  for (let photo of selectionManager.items) {
    let v = photo[1].wire.favorite;
    if (!v) {
      none++;
    } else if (v > 0) {
      fav++;
    } else {
      unfav++;
    }
  }

  if (fav > 0 && (unfav == 0 || none == 0)) {
    return 1;
  } else if (unfav > 0 && (fav == 0 || none == 0)) {
    return -1;
  } else {
    return 0;
  }
}

export function StatusBar(props: { className?: string }) {
  let [favorite, setFavorite] = useState(0);

  useEffect(() => {
    let id = selectionManager.addOnAnySelected((photo: AlbumPhoto, value: boolean) => {
      setFavorite(computeAggregatedFavs());
    });
    return () => {
      selectionManager.removeOnAnySelected(id);
    }
  });

  function handleThumbsUp() {
    let val = (favorite !== 1) ? 1 : 0;
    for (let x of selectionManager.items) {
      x[1].favorite = val;
    }
    setFavorite(computeAggregatedFavs());
  }

  function handleThumbsDown() {
    let val = (favorite !== -1) ? -1 : 0;
    for (let x of selectionManager.items) {
      x[1].favorite = val;
    }
    setFavorite(computeAggregatedFavs());
  }

  return (
    <AppBar position="static" className={props.className}>
      <Toolbar variant="dense">
        <IconButton color="primary" aria-label="like" onClick={handleThumbsUp}>{(favorite > 0) ? thumbsUpFill : thumbsUp}</IconButton>
        <IconButton color="primary" aria-label="dislike" onClick={handleThumbsDown}>{(favorite < 0) ? thumbsDownFill : thumbsDown}</IconButton>
      </Toolbar>
    </AppBar >)
};
