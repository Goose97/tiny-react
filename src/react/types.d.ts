import ClassComponent from './component';

declare namespace TinyReact {
  type Void = null | undefined;
  type Props = {
    children?: ChildrenElements;
    [key: string]: any;
  };

  type State = {
    [key: string]: any;
  } | null;

  export type ChildrenElements = Array<Element | string>;

  export type FunctionComponent = (props: Props) => Element | Void;

  // This is the constructor of react elements
  export type TagName = string;
  export type Component = ClassComponent | FunctionComponent;
  export type ComponentType = 'class' | 'function';

  export type Element = {
    // Can be either string (span, div) or component (class or function)
    type: TinyReact.TagName | Function;
    props: Props;
    key: string | null;
    textContent?: string;
  };

  export type EffectTag =
    | 'dom:insert'
    | 'dom:update'
    | 'dom:delete'
    | 'lifecycle:insert'
    | 'lifecycle:update'
    | 'lifecycle:delete';
}

export default TinyReact;
