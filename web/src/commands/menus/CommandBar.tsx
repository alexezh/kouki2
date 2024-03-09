import AppBar from '@mui/material/AppBar/AppBar';
import Toolbar from '@mui/material/Toolbar/Toolbar';
import { AlbumPhoto } from '../../photo/AlbumPhoto';
import { useEffect, useState } from 'react';
import React from 'react';
import { EditMenu } from './EditMenu';
import { LibraryMenu } from './LibraryMenu';
import { FilterMenu } from './FilterMenu';
import { PhotoList } from '../../photo/PhotoList';
import { addOnStateChanged, getAppState, removeOnStateChanged, setTextFilter } from '../AppState';
import TextField from '@mui/material/TextField/TextField';
import { Divider } from '@mui/material';
import { CommandMenu } from './CommandMenu';

export function CommandBar(props: { className?: string }) {
  const [anchorEl, setAnchorEl] = useState<null | { elem: HTMLElement, id: string }>(null);
  const [value, setValue] = useState("");

  function handleMenuClick(id: string, event: React.MouseEvent<HTMLElement>) {
    setAnchorEl({ elem: event.currentTarget, id: id });
  }

  function closeMenu() {
    if (anchorEl) {
      setAnchorEl(null);
    }
  }

  function handleChanged(event: React.ChangeEvent) {
    // @ts-ignore
    let val: string = event.target.value;
    setValue(val);
    setTextFilter(val);
  }

  // <Button variant="text" onClick={handleSelectAll}>Add Quick</Button>
  //  <Button variant="text" onClick={handleSelectAll}>Select All</Button>
  return (
    <AppBar position="static" className={props.className}>
      <Toolbar variant="dense">
        <CommandMenu open={anchorEl?.id === "edit"} anchorEl={anchorEl?.elem ?? null} label="Grid" id="grid" onMenuClick={handleMenuClick} onMenuClose={closeMenu} />
        <EditMenu open={anchorEl?.id === "edit"} anchorEl={anchorEl?.elem ?? null} label="Edit" id="edit" onMenuClick={handleMenuClick} onMenuClose={closeMenu} />
        <LibraryMenu open={anchorEl?.id === "library"} anchorEl={anchorEl?.elem ?? null} label='Library' id='library' onMenuClick={handleMenuClick} onMenuClose={closeMenu} />
        {
          // <FilterMenu open={anchorEl?.id === "filter"} anchorEl={anchorEl?.elem ?? null} label='Filter' id='filter' onMenuClick={handleMenuClick} onMenuClose={closeMenu} />
        }
        <Divider sx={{ width: 50 }} />
        <TextField
          sx={{ maxWidth: 400 }}
          autoFocus
          margin="dense"
          id="name"
          label=""
          type="text"
          placeholder="Search"
          fullWidth
          variant="standard"
          value={value}
          onChange={handleChanged}
        />
      </Toolbar>
    </AppBar >)
};
