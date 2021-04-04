import TinyReact from '../src/react';
import B from './B';

export class A extends TinyReact.Component {
  componentDidMount() {
    console.log('im in A');
  }

  render() {
    return TinyReact.createElement('div', { id: 'componentA' }, [
      TinyReact.createElement(
        'span',
        { className: 'inside-span', aNasNas: 2, b: 7 },
        [
          TinyReact.createElement('b', {}, ['im bold']),
          TinyReact.createElement('em', {}, ['im italic']),
        ],
      ),
      TinyReact.createElement(B, { id: 1 }),
      TinyReact.createElement(B, { id: 2 }),
    ]);
  }
}

export default A;
