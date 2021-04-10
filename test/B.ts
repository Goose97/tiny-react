import TinyReact from '../src/react';
import C from './C';
import Logger from '../src/shared/logger';

export class B extends TinyReact.Component {
  constructor() {
    super();
    this.state = { count: 1 };
  }

  componentDidMount() {
    console.log(`123123123`, 123123123);
    setTimeout(() => {
      this.setState({ count: 2 });
    }, 3000);
  }

  componentDidUpdate(prevProps: any, prevState: any) {
    Logger.success('PROCESSING POST MUTATION EFFECT OF COMPONENT B');
    Logger.log(prevProps, prevState);
  }

  render() {
    // @ts-ignore
    const { count } = this.state;

    let children = [
      TinyReact.createElement('p', { id: 'B-1' }, [
        TinyReact.createElement('span', { id: 'B-1-1' }, [
          `This is current count: ${this.state!.count}`,
        ]),
      ]),

      'This is just text',
    ];

    if (count === 2) {
      children.push(
        TinyReact.createElement('div', { id: 'B-2' }, [
          TinyReact.createElement('span', { id: 'B-2-1' }, [
            'Well just another p tag inside div',
            TinyReact.createElement('span', { id: 'B-2-1-1' }, [
              'Text inside text',
            ]),
            TinyReact.createElement(C, { id: 'B-2-1-2' }, ['Children of C']),
          ]),
        ]),
      );
    }

    // if (count === 2) {
    //   children.pop();
    //   children.push(
    //     TinyReact.createElement('div', { id: 'div child of component B' }, [
    //       TinyReact.createElement('span', { id: 'span child of div' }, [
    //         'Well just another p tag inside div',
    //       ]),
    //     ]),
    //   );

    //   children.reverse();
    // }

    console.log(`children in render`, children);

    // if (this.props.id === 1)
    //   children.push(TinyReact.createElement(C, { id: 3 }, ['My C children']));

    return TinyReact.createElement('p', { id: 'B' }, children);
  }
}

export default B;
