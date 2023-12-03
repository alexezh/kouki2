import AppBar from '@mui/material/AppBar/AppBar';
import Toolbar from '@mui/material/Toolbar/Toolbar';
import Button from '@mui/material/Button/Button';
import { AlbumPhoto, selectionManager } from './PhotoStore';
import { select } from 'underscore';
import { useState } from 'react';
import Menu from '@mui/material/Menu/Menu';
import MenuItem from '@mui/material/MenuItem/MenuItem';
import Box from '@mui/material/Box/Box';

export function CommandBar(props: { className?: string, photos: AlbumPhoto[] }) {
  const [anchorElEdit, setAnchorElEdit] = useState<null | HTMLElement>(null);

  const handleOpenEditMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElEdit(event.currentTarget);
  };

  function handleCloseEditMenu() {
    selectionManager.remove(props.photos);
    setAnchorElEdit(null);
  }

  function handleSelectAll() {
    selectionManager.add(props.photos);
    setAnchorElEdit(null);
  }

  function handleSelectNone() {
    selectionManager.remove(props.photos);
    setAnchorElEdit(null);
  }

  function handleInvertSelect() {
    let select: AlbumPhoto[] = [];
    for (let x of props.photos) {
      if (!selectionManager.items.get(x.wire.hash)) {
        select.push(x);
      }
    }
    selectionManager.clear();
    selectionManager.add(select);
    setAnchorElEdit(null);
  }

  // <Button variant="text" onClick={handleSelectAll}>Add Quick</Button>
  //  <Button variant="text" onClick={handleSelectAll}>Select All</Button>
  return (
    <AppBar position="static" className={props.className}>
      <Toolbar variant="dense">
        <Box sx={{ flexGrow: 0 }}>
          <Button onClick={handleOpenEditMenu} sx={{ p: 0 }}>Edit</Button>
          <Menu
            id="menu-appbar"
            anchorEl={anchorElEdit}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            open={Boolean(anchorElEdit)}
            onClose={handleCloseEditMenu}
            sx={{
              display: { xs: 'block', md: 'none' },
            }}
          >
            <MenuItem key="edit_all" onClick={handleSelectAll}>Select All</MenuItem>
            <MenuItem key="edit_none" onClick={handleSelectNone}>Select None</MenuItem>
            <MenuItem key="invert_select" onClick={handleInvertSelect}>Invert Selection</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>)
};
