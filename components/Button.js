import TinyReact from '../src/react';

export class Button extends TinyReact.Component {
  constructor() {
    super();
  }

  render() {
    console.log('im in render button');
    const children = this.props.children;
    return TinyReact.createElement(
      'button',
      { ...this.props, id: 'button element' },
      children,
    );
  }
}

export default Button;
