import Fiber from './fiber';

const PENDING_TIME = 50;

class UpdateScheduler {
  state: 'idle' | 'pending' | 'processing';
  callback?: Function;
  currentTree: Fiber | null;

  constructor() {
    this.state = 'idle';
    this.currentTree = null;
  }

  setCurrentTree(fiber: Fiber) {
    this.currentTree = fiber;
  }

  enqueueUpdate() {
    switch (this.state) {
      case 'idle':
        this.state = 'pending';
        setTimeout(this.processUpdate, PENDING_TIME); // Batch update
        break;

      case 'pending':
        break;

      case 'processing':
        console.log('Currently in render phase');
        break;
    }
  }

  processUpdate = async () => {
    const currentFiberTree = this.currentTree;
    if (currentFiberTree) await currentFiberTree.processUpdate();
    this.state = 'idle';
  };
}

const singleton = new UpdateScheduler();
export default singleton;
