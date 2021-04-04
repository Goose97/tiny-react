import TinyReact from '../src/react';
import C from './C';

export class B extends TinyReact.Component {
  componentDidMount() {
    console.log(`im in B ${this.props.id}`);
  }

  render() {
    let children = [
      TinyReact.createElement('span', {}, ['This is class component B']),
      TinyReact.createElement('p', {}, ['Well just another p tag']),
    ];
    if (this.props.id === 1)
      children.push(TinyReact.createElement(C, { id: 3 }, ['My C children']));

    return TinyReact.createElement('p', { id: 'componentB' }, children);
  }
}

export default B;
