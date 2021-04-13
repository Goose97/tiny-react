import TinyReact from '../src/react';

export class C extends TinyReact.Component {
  constructor() {
    super();
    this.state = {
      content: 'hello',
    };
  }

  componentDidMount() {
    console.log(`im in C ${this.props.id}`);
    setTimeout(() => this.setState({ content: 'hello again' }), 7000);
  }

  render() {
    //@ts-ignore
    const content = this.state.content;
    let children = [TinyReact.createElement('span', { id: 'C-1' }, [content])];
    if (content === 'hello again')
      children.push(
        TinyReact.createElement('div', { id: 'C-2' }, [
          'This is content of a div',
        ]),
      );

    return TinyReact.createElement('p', { id: 'C' }, children);
  }
}

export default C;
