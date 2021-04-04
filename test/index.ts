import TinyReact from '../src/react';
import TinyReactDOM from '../src/react-dom';
import A from './A';

const simpleDivElement = TinyReact.createElement(
  'div',
  {
    className: 'heoheo',
    key: 6,
  },
  ['Thanh cong roi'],
);
const classComponent = TinyReact.createElement(A, {});

const root = document.getElementById('container')!;

TinyReactDOM.render(classComponent, root);
