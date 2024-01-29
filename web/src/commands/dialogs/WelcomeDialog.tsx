import DialogTitle from "@mui/material/DialogTitle/DialogTitle";
import DialogContent from "@mui/material/DialogContent/DialogContent";
import Dialog from "@mui/material/Dialog/Dialog";
import DialogContentText from "@mui/material/DialogContentText/DialogContentText";
import DialogActions from "@mui/material/DialogActions/DialogActions";
import Button from "@mui/material/Button/Button";
import { DialogProps } from "./DialogManager";
import { Command, invokeCommand } from "../Commands";

export function WelcomeDialog(props: DialogProps) {

  return (
    <Dialog open={true} fullWidth={true} onClose={() => { props.onClose() }}>
      <DialogTitle>Welcome</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Welcome from Kouki2, your unopinionated photo librararian.
        </DialogContentText>
        <DialogContentText sx={{ mt: 3 }}>
          It looks that you do not have anything in your library. Do you want me to scan your drive and find some folders to the library? You can alsways add more folders later.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { props.onClose(() => invokeCommand(Command.ImportFolder)) }}>Add</Button>
        <Button onClick={() => { props.onClose() }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
