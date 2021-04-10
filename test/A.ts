import TinyReact from '../src/react';
import B from './B';

export class A extends TinyReact.Component {
  constructor() {
    super();
    this.state = {
      bold: 'im bold content',
      italic: 'im italic content',
    };
  }

  render() {
    // @ts-ignore
    const { bold, italic } = this.state;

    console.log('im in A render');

    return TinyReact.createElement('div', { id: 'div sole children of A' }, [
      TinyReact.createElement(
        'span',
        {
          id: 'span children of componentA',
          className: 'inside-span',
          aNasNas: 2,
          b: 7,
        },
        [
          TinyReact.createElement('b', { id: 'b tag' }, [bold]),
          TinyReact.createElement('em', { id: 'em tag' }, [italic]),
          'nothing tag',
        ],
      ),
      TinyReact.createElement(B, { id: 'componentB' }),
      // TinyReact.createElement(B, { id: 2 }),
    ]);
  }
}

export default A;
