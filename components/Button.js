import TinyReact from '../src/react';

export class Button extends TinyReact.Component {
  constructor() {
    super();
  }

  shouldComponentUpdate(nextProps, nextState) {
    console.log(`nextProps`, nextProps);
    console.log(`nextState`, nextState);
    return false;
  }

  render() {
    const children = this.props.children;
    return TinyReact.createElement(
      'button',
      { ...this.props, id: 'button element' },
      children,
    );
  }
}

export default Button;
