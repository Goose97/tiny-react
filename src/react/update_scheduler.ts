const PENDING_TIME = 50;

class UpdateScheduler {
  state: 'idle' | 'pending' | 'processing';
  callback?: Function;

  constructor() {
    this.state = 'idle';
  }

  enqueueUpdate() {
    switch (this.state) {
      case 'idle':
        this.state = 'pending';

        // Batch update
        if (this.callback) setTimeout(this.callback, PENDING_TIME);
        break;

      case 'pending':
        break;

      case 'processing':
        console.log('Currently in render phase');
        break;
    }
  }

  registerCallback(callback: Function) {
    this.callback = callback;
  }
}

const singleton = new UpdateScheduler();
export default singleton;
