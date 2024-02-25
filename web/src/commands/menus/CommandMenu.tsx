import { Paper } from "@mui/material";
import Box from "@mui/material/Box/Box";
import Button from "@mui/material/Button/Button";
import Menu from "@mui/material/Menu/Menu";
import { PropsWithChildren, createContext } from "react";

export type MenuCloseHandler = () => void;
export type CommandMenuProps = PropsWithChildren<{
  menuClassName?: string,
  open: boolean,
  anchorEl: HTMLElement | null,
  label: string,
  id: string,
  onMenuClick: (id: string, event: React.MouseEvent<HTMLElement>) => void,
  onMenuClose: MenuCloseHandler,
  extra?: () => JSX.Element
}>;

export const CommandMenuContext = createContext<MenuCloseHandler | null>(null);

export function CommandMenu(props: CommandMenuProps) {
  return (
    <CommandMenuContext.Provider value={props.onMenuClose}>
      <Box sx={{ flexGrow: 0 }}>
        <Button
          onClick={(event: React.MouseEvent<HTMLElement>) => {
            props.onMenuClick(props.id, event);
          }}
          sx={{ p: 0 }}>{props.label}
        </Button>
        <Menu
          className={props.menuClassName}
          id={props.id}
          sx={{ mt: '0px', width: '400px' }}
          anchorEl={props.anchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          open={props.open}
          onClose={props.onMenuClose}
        >
          <Paper sx={{ width: 320, maxWidth: '100%' }}>
            {props.children}
          </Paper>
        </Menu>
        {props.extra ? props.extra() : null}
      </Box>
    </CommandMenuContext.Provider>
  )
}