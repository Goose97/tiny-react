import TinyReact from './types';

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

  constructor() {
    this.state = null;
    this.props = {};
  }

  setState(changes: TinyReact.State) {
    console.log(`changes`, changes);
  }
}

// @ts-ignore
ClassComponent.prototype.isReactClass = true;

export default ClassComponent;
