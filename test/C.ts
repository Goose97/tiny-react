import TinyReact from '../src/react';

export class C extends TinyReact.Component {
  componentDidMount() {
    console.log(`im in C ${this.props.id}`);
  }

  render() {
    // <span id='componentA'>This is class component C</span>
    return TinyReact.createElement('p', { id: 'componentC' }, [
      TinyReact.createElement('span', {}, this.props.children),
    ]);
  }
}

export default C;
