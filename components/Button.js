import TinyReact from '../src/react';

export class Button extends TinyReact.Component {
  constructor() {
    super();
  }

  render() {
    const children = this.props.children;
    return TinyReact.createElement('button', this.props, children);
  }
}

export default Button;
