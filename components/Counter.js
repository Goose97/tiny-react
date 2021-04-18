import TinyReact from '../src/react';
import Button from './Button';

export class Counter extends TinyReact.Component {
  constructor() {
    super();
    this.state = {
      count: 1,
    };
  }

  handleButtonClick(e) {
    console.log(`this.state.count`, this.state.count);
    this.setState({ count: this.state.count + 1 });
  }

  render() {
    const defaultProps = {
      className: 'tiny-react-counter__wrapper',
      id: 'Counter wrapper',
    };
    const button = TinyReact.createElement(
      Button,
      {
        className: 'tiny-react-counter__button',
        onClick: this.handleButtonClick.bind(this),
        id: 'Button wrapper',
      },
      ['Click me'],
    );
    const countNumber = TinyReact.createElement(
      'span',
      { className: 'tiny-react-counter__number', id: 'Counter span' },
      [`Current value is ${this.state.count}`],
    );

    return TinyReact.createElement('div', { ...this.props, ...defaultProps }, [
      button,
      countNumber,
    ]);
  }
}

export default Counter;
