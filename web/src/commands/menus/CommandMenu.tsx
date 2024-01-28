import Box from "@mui/material/Box/Box";
import Button from "@mui/material/Button/Button";
import Menu from "@mui/material/Menu/Menu";
import { PropsWithChildren } from "react";

export type CommandMenuProps = PropsWithChildren<{
  menuClassName?: string,
  open: boolean,
  anchorEl: HTMLElement | null,
  label: string,
  id: string,
  onMenuClick: (id: string, event: React.MouseEvent<HTMLElement>) => void,
  onMenuClose: () => void,
  extra?: () => JSX.Element
}>;

export function CommandMenu(props: CommandMenuProps) {
  return (
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
        {props.children}
      </Menu>
      {props.extra ? props.extra() : null}
    </Box>
  )
}