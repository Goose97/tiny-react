import TinyReact from '../src/react';
import TinyReactDOM from '../src/react-dom';

import Counter from '../components/Counter';

// const classComponent = TinyReact.createElement(A, { id: 'componentA' });
// const classComponent = TinyReact.createElement(D, { id: 'componentD' }, []);
const counter = TinyReact.createElement(Counter, {
  id: 'root element',
  onChange: newValue => console.log(`newValue`, newValue),
});

const root = document.getElementById('container');

TinyReactDOM.render(TinyReact.createElement('div', {}, [counter]), root);
