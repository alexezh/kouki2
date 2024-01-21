import AppBar from '@mui/material/AppBar/AppBar';
import Toolbar from '@mui/material/Toolbar/Toolbar';
import { AlbumPhoto } from '../photo/AlbumPhoto';
import { useEffect, useState } from 'react';
import React from 'react';
import { EditMenu } from './SelectMenu';
import { LibraryMenu } from './LibraryMenu';
import { FilterMenu } from './FilterMenu';
import { PhotoList } from '../photo/PhotoList';
import { addOnStateChanged, getState, removeOnStateChanged } from './AppState';

export function CommandBar(props: { className?: string }) {
  const [anchorEl, setAnchorEl] = useState<null | { elem: HTMLElement, id: string }>(null);

  function handleMenuClick(id: string, event: React.MouseEvent<HTMLElement>) {
    setAnchorEl({ elem: event.currentTarget, id: id });
  }

  function closeMenu() {
    if (anchorEl) {
      setAnchorEl(null);
    }
  }

  // <Button variant="text" onClick={handleSelectAll}>Add Quick</Button>
  //  <Button variant="text" onClick={handleSelectAll}>Select All</Button>
  return (
    <AppBar position="static" className={props.className}>
      <Toolbar variant="dense">
        <EditMenu open={anchorEl?.id === "edit"} anchorEl={anchorEl?.elem ?? null} label="Edit" id="edit" onMenuClick={handleMenuClick} onMenuClose={closeMenu} />
        <LibraryMenu open={anchorEl?.id === "library"} anchorEl={anchorEl?.elem ?? null} label='Library' id='library' onMenuClick={handleMenuClick} onMenuClose={closeMenu} />
        <FilterMenu open={anchorEl?.id === "filter"} anchorEl={anchorEl?.elem ?? null} label='Filter' id='filter' onMenuClick={handleMenuClick} onMenuClose={closeMenu} />
      </Toolbar>
    </AppBar >)
};

{/* 
            <MenuItem key="lib_star1" onClick={handleRescanFolder}>Rescan Folder</MenuItem>
            <MenuItem key="new_coll" onClick={handleNewCollection}>New Collection</MenuItem>

<Divider />
<DatePicker
  label=""
  views={['year', 'month', 'day']}
  slotProps={{ textField: { size: 'small' } }} /> */}
