import TinyReact from '../src/react';
import TinyReactDOM from '../src/react-dom';
import A from './A';
import C from './C';

const simpleDivElement = TinyReact.createElement(
  'div',
  {
    className: 'heoheo',
    key: 6,
  },
  ['Thanh cong roi'],
);

const classComponent = TinyReact.createElement(A, { id: 'componentA' });
// const classComponent = TinyReact.createElement(C, { id: 'componentC' }, [
//   'This is text',
// ]);

const root = document.getElementById('container')!;

TinyReactDOM.render(classComponent, root);
