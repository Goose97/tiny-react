import TinyReact from '../src/react';

export class D extends TinyReact.Component {
  constructor() {
    super();
    this.state = {
      flip: false,
    };
  }

  componentDidMount() {
    setTimeout(() => this.setState({ flip: true }), 3000);
  }

  render() {
    let children = [
      TinyReact.createElement('li', { id: 'D-1', key: '11' }, ['First child']),
      TinyReact.createElement('li', { id: 'D-2', key: '22' }, ['Second child']),
      TinyReact.createElement('li', { id: 'D-3', key: '33' }, ['Third child']),
      TinyReact.createElement('li', { id: 'D-4', key: '44' }, ['Fourth child']),
      TinyReact.createElement('li', { id: 'D-5', key: '55' }, ['Fifth child']),
      TinyReact.createElement('li', { id: 'D-6', key: '66' }, ['Sixth child']),
    ];
    //@ts-ignore
    if (this.state.flip) {
      children = [
        // TinyReact.createElement('li', { id: 'D-7', key: '77' }, [
        //   'Seventh child',
        // ]),
        TinyReact.createElement('li', { id: 'D-3', key: '33' }, [
          'Third child',
        ]),
        // TinyReact.createElement('li', { id: 'D-2', key: '22' }, [
        //   'Second child',
        // ]),
        TinyReact.createElement('li', { id: 'D-4', key: '44' }, [
          'Fourth child',
        ]),
        TinyReact.createElement('li', { id: 'D-1', key: '11' }, [
          'First child',
        ]),
        TinyReact.createElement('li', { id: 'D-6', key: '66' }, [
          'Sixth child',
        ]),
        TinyReact.createElement('li', { id: 'D-5', key: '55' }, [
          'Fifth child',
        ]),
      ];
    }

    return TinyReact.createElement('ul', { id: 'D' }, children);
  }
}

export default D;
