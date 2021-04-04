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

  componentDidMount() {
    console.log('im in A');

    setTimeout(() => {
      this.setState({
        bold: 'im bold content but changed',
      });

      this.setState({
        italic: 'im italic content but changed',
      });
    }, 2000);
  }

  render() {
    // @ts-ignore
    const { bold, italic } = this.state;

    return TinyReact.createElement('div', { id: 'componentA' }, [
      TinyReact.createElement(
        'span',
        { className: 'inside-span', aNasNas: 2, b: 7 },
        [
          TinyReact.createElement('b', {}, [bold]),
          TinyReact.createElement('em', {}, [italic]),
        ],
      ),
      TinyReact.createElement(B, { id: 1 }),
      TinyReact.createElement(B, { id: 2 }),
    ]);
  }
}

export default A;
