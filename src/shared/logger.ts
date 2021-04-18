class Logger {
  private logLevel: number;

  constructor() {
    // 1 - Error
    // 2 - Warning
    // 3 - Info
    // 4 - Trace
    this.logLevel = 0;
  }

  success(message: string) {
    if (this.logLevel < 3) return;
    console.log(`%c${message}`, 'color: #0F9960; font-weight: bold;');
  }

  warning(message: string) {
    if (this.logLevel < 2) return;
    console.log(`%c${message}`, 'color: #D99E0B; font-weight: bold;');
  }

  error(title: string, message: string) {
    if (title) console.log(`%c${title}`, 'color: #DB3737; font-weight: bold;');
    if (message) console.log(message);
  }

  log(...message: any[]) {
    if (this.logLevel < 4) return;
    console.log(...message);
  }
}

const singleton = new Logger();
export default singleton;
