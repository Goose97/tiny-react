import TinyReact from '../src/react';
import Button from './Button';

export class List extends TinyReact.Component {
  constructor() {
    super();
    this.state = {
      list: [],
    };

    this.currentSequence = 0;
  }

  addMoreChildren() {
    console.log(`123123`, 123123);
    const { list } = this.state;
    this.setState({ list: list.concat(this.currentSequence++) });
  }

  render() {
    const defaultProps = {
      className: 'tiny-react-list__wrapper',
      id: 'List wrapper',
    };
    const children = this.state.list.map(value =>
      TinyReact.createElement('li', {}, [`This children has id ${value}`]),
    );

    console.log(`this.state.list`, this.state.list);

    const buttonProps =
      this.currentSequence === 3
        ? {}
        : { onClick: this.addMoreChildren.bind(this) };

    return TinyReact.createElement('div', { ...defaultProps, ...this.props }, [
      TinyReact.createElement(
        Button,
        // { onClick: this.addMoreChildren.bind(this) },
        buttonProps,
        ['Add more children'],
      ),
      TinyReact.createElement('ul', {}, children),
    ]);
  }
}

export default List;
