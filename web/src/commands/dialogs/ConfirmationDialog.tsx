import DialogTitle from "@mui/material/DialogTitle/DialogTitle";
import DialogContent from "@mui/material/DialogContent/DialogContent";
import Dialog from "@mui/material/Dialog/Dialog";
import DialogContentText from "@mui/material/DialogContentText/DialogContentText";
import DialogActions from "@mui/material/DialogActions/DialogActions";
import Button from "@mui/material/Button/Button";
import { DialogProps, showDialog } from "./DialogManager";

type ConfirmationDialogProps = {
  title: string,
  text: string,
  onClose: (result: boolean) => void;
};

export function showConfirmationDialog(title: string, text: string): Promise<boolean> {
  let promise = new Promise<boolean>((resolve) => {
    showDialog((props: DialogProps) => {
      return (
        <ConfirmationDialog
          onClose={(result: boolean) => {
            resolve(result);
            props.onClose()
          }}
          title={title}
          text={text} />
      )
    });
  });

  return promise;
}

export function ConfirmationDialog(props: ConfirmationDialogProps) {

  return (
    <Dialog open={true} fullWidth={true} onClose={() => { props.onClose(false) }}>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {props.text}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { props.onClose(true) }}>Ok</Button>
        <Button onClick={() => { props.onClose(false) }}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
