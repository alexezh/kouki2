import AppBar from '@mui/material/AppBar/AppBar';
import Toolbar from '@mui/material/Toolbar/Toolbar';
import { useEffect, useState } from 'react';
import React from 'react';
import { EditMenu } from './EditMenu';
import { LibraryMenu } from './LibraryMenu';
import { ViewMode, addOnStateChanged, getAppState, removeOnStateChanged, setTextFilter } from '../AppState';
import TextField from '@mui/material/TextField/TextField';
import { Command, invokeCommand } from '../Commands';
import Button from '@mui/material/Button/Button';
import Divider from '@mui/material/Divider/Divider';
import ToggleButton from '@mui/material/ToggleButton/ToggleButton';
import { IconButton } from '@mui/material';
import { ReactionKind } from '../../lib/photoclient';

export function CommandBar(props: { className?: string }) {
  const [anchorEl, setAnchorEl] = useState<null | { elem: HTMLElement, id: string }>(null);
  const [viewMode, setViewMode] = useState(getAppState().viewMode);
  const [value, setValue] = useState("");

  useEffect(() => {
    let id = addOnStateChanged(() => {
      setViewMode(getAppState().viewMode);
    });

    return () => {
      removeOnStateChanged(id);
    }
  }, []);

  function handleMenuClick(id: string, event: React.MouseEvent<HTMLElement>) {
    setAnchorEl({ elem: event.currentTarget, id: id });
  }

  function closeMenu() {
    if (anchorEl) {
      setAnchorEl(null);
    }
  }

  function handleBack() {
    invokeCommand(Command.NavigateBack);
  }

  function handleChanged(event: React.ChangeEvent) {
    // @ts-ignore
    let val: string = event.target.value;
    setValue(val);
    setTextFilter(val);
  }

  function handleReaction(val: ReactionKind) {
    invokeCommand(Command.AddReaction, val)
  }

  return (
    <AppBar position="static" className={props.className}>
      <Toolbar variant="dense">
        <Button
          onClick={(event: React.MouseEvent<HTMLElement>) => {
            handleBack();
          }}
          disabled={viewMode === ViewMode.grid}
          sx={{ p: 0 }}>{"<Back"}
        </Button>
        <IconButton sx={{ fontSize: 20 }} value="grinning" onClick={() => handleReaction(ReactionKind.Grinning)}>&#x1F600;</IconButton>
        <IconButton sx={{ fontSize: 20 }} value="purpleheart" onClick={() => handleReaction(ReactionKind.PurpleHeart)}>&#x1FA77;</IconButton>
        <IconButton sx={{ fontSize: 20 }} value="thumbsup" onClick={() => handleReaction(ReactionKind.ThumbsUp)}>&#x1F44D;</IconButton>
        <IconButton sx={{ fontSize: 20 }} value="thumbsdown" onClick={() => handleReaction(ReactionKind.ThumbsDown)}>&#x1F44E;</IconButton>
        <EditMenu
          open={anchorEl?.id === "edit"}
          anchorEl={anchorEl?.elem ?? null}
          label="Edit" id="edit"
          onMenuClick={handleMenuClick}
          onMenuClose={closeMenu} />
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
