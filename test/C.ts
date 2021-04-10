import TinyReact from '../src/react';

export class C extends TinyReact.Component {
  componentDidMount() {
    console.log(`im in C ${this.props.id}`);
  }

  render() {
    // <span id='componentA'>This is class component C</span>
    return TinyReact.createElement('p', { id: 'C' }, [
      TinyReact.createElement('span', { id: 'C-1' }, this.props.children),
    ]);
  }
}

export default C;
