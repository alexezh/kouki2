import AppBar from '@mui/material/AppBar/AppBar';
import Toolbar from '@mui/material/Toolbar/Toolbar';
import IconButton from '@mui/material/IconButton/IconButton';
import Typography from '@mui/material/Typography/Typography';
import Button from '@mui/material/Button/Button';
import Icon from '@mui/material/Icon/Icon';
import { useEffect, useState } from 'react';
import { computeAggregatedFavs, selectionManager } from './SelectionManager';
import { setFocusAlbum } from './Commands';
import { UpdatePhotoContext } from '../photo/UpdatePhotoContext';

const acceptedActive = (
  <Icon>
    <img className='Status-bar-icon' src="./assets/smiley.svg" />
  </Icon >);

const acceptedInactive = (
  <Icon>
    <img className='Status-bar-icon' src="./assets/smiley-inactive.svg" />
  </Icon >);

const rejectedActive = (
  <Icon>
    <img className='Status-bar-icon' src="./assets/smiley-sad.svg" />
  </Icon >);

const rejectedInactive = (
  <Icon>
    <img className='Status-bar-icon' src="./assets/smiley-sad-inactive.svg" />
  </Icon >);

export function StatusBar(props: { className?: string }) {
  let [favorite, setFavorite] = useState(0);

  useEffect(() => {
    let id = selectionManager.addOnSelectionChanged(() => {
      setFavorite(computeAggregatedFavs());
    });
    return () => {
      selectionManager.removeOnSelectionChanged(id);
    }
  });

  function handleAccept() {
    let val = (favorite !== 1) ? 1 : 0;
    let ctx = new UpdatePhotoContext();
    for (let x of selectionManager.items) {
      x[1].setFavorite(val, ctx);
    }
    ctx.commit();
    setFavorite(computeAggregatedFavs());
    setFocusAlbum();
  }

  function handleReject() {
    let val = (favorite !== -1) ? -1 : 0;
    let ctx = new UpdatePhotoContext();
    selectionManager.forEach((x) => { x.setFavorite(val, ctx); });
    ctx.commit();
    setFavorite(computeAggregatedFavs());
    setFocusAlbum();
  }

  return (
    <AppBar position="static" className={props.className}>
      <Toolbar variant="dense">
        <IconButton color="primary" aria-label="like" onClick={handleAccept}>{(favorite > 0) ? acceptedActive : acceptedInactive}</IconButton>
        <IconButton color="primary" aria-label="dislike" onClick={handleReject}>{(favorite < 0) ? rejectedActive : rejectedInactive}</IconButton>
      </Toolbar>
    </AppBar >)
};
