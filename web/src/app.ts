
/**
 * perforrms basic initialization; not used by other things
 */
export class App {
  private appContainer: HTMLDivElement | undefined;

  public initializeApp(gameContainer: HTMLDivElement) {
    // now start initialization
    window.onresize = () => this.resizeCanvas();
  }

  private resizeCanvas() {
    if (this.appContainer === undefined) {
      return;
    }

    this.appContainer.style.width = window.innerWidth.toString();
    this.appContainer.style.height = window.innerHeight.toString();
  }
}

