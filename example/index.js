import TinyReact from '../src/react';
import TinyReactDOM from '../src/react-dom';

import Counter from '../components/Counter';
import Input from '../components/Input';
import List from '../components/List';

// const classComponent = TinyReact.createElement(A, { id: 'componentA' });
// const classComponent = TinyReact.createElement(D, { id: 'componentD' }, []);
const counter = TinyReact.createElement(Counter, {});
const input = TinyReact.createElement(Input, {});
const list = TinyReact.createElement(List, {});

const root = document.getElementById('container');

TinyReactDOM.render(
  TinyReact.createElement('div', {}, [counter, input, list]),
  root,
);
