export class Logger {
  static debug: boolean = false;

  static log = (message: any) => {
    if (this.debug) {
      console.debug(message);
    }
  };

  static warn = (message: any) => {
    if (this.debug) {
      console.warn(message);
    }
  };
}