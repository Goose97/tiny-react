import TinyReact from '../src/react';

export class Input extends TinyReact.Component {
  constructor() {
    super();
    this.state = {
      value: '',
    };
  }

  render() {
    const defaultProps = {
      className: 'tiny-react-input__wrapper',
      id: 'Input wrapper',
      value: this.state.value,
      onChange: e => this.setState({ value: e.currentTarget.value }),
    };

    console.log(`this.state.value`, this.state.value);

    return TinyReact.createElement(
      'input',
      { ...defaultProps, ...this.props },
      [],
    );
  }
}

export default Input;
