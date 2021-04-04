import TinyReact from './types';
import Fiber from './fiber';

class ClassComponent {
  componentWillMount?(): void;
  componentDidMount?(): void;
  shouldComponentUpdate?(
    nextProps: TinyReact.Props,
    nextState: TinyReact.State,
  ): boolean;
  componentDidUpdate?(
    prevProps: TinyReact.Props,
    prevState: TinyReact.State,
  ): void;
  componentWillUnmount?(): void;
  state: TinyReact.State;
  props: TinyReact.Props;
  _internalFiber: Fiber | null;

  constructor() {
    this.state = null;
    this.props = {};
    this._internalFiber = null;
  }

  setState(changes: TinyReact.State) {
    console.log(`changes`, changes);
    if (this._internalFiber) this._internalFiber.enqueueUpdate(changes);
  }
}

// @ts-ignore
ClassComponent.prototype.isReactClass = true;

export default ClassComponent;
