import { Shell } from "./ui/shell";
import { setShell, shell } from "./ui/igameshell";
import { createVM } from "./engine/vm";
import { vm } from "./engine/ivm";
import { setSessionId, wireGetUserString } from "./lib/fetchadapter";
import { createDefaultProject } from "./actions/createprojectaction";

const demoWorldId = "7fa84179-dc58-4939-8678-03370fd137f3";

/**
 * perforrms basic initialization; not used by other things
 */
export class GameApp {
  private gameContainer: HTMLDivElement | undefined;

  public initializeApp(gameContainer: HTMLDivElement) {

    // first set session id
    let account = window.localStorage.getItem('account');
    let session: string | undefined = undefined;
    if (account !== null && account !== undefined) {
      session = JSON.parse(account).session;
    }
    if (session === undefined) {
      throw new Error('Not logged in');
    }
    setSessionId(session);

    // now start initialization
    window.onresize = () => this.resizeCanvas();

    this.gameContainer = gameContainer;
    this.resizeCanvas();

    createVM(gameContainer, createDefaultProject);

    setShell(new Shell(gameContainer));

    setTimeout(async () => {
      //let lastProject = await wireGetUserString('lastProject');
      let lastProject = demoWorldId;
      if (lastProject === undefined) {
        lastProject = demoWorldId;
      }

      await vm.loadProject(lastProject);
      vm.start();
    });
  }

  private resizeCanvas() {
    if (this.gameContainer === undefined) {
      return;
    }

    this.gameContainer.style.width = window.innerWidth.toString();
    this.gameContainer.style.height = window.innerHeight.toString();
    if (shell !== undefined) {
      shell.refresh();
    }
  }
}

