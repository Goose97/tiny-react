import TinyReact from './types';
import Component from './component';

// This function is meant to create a react element,
// either from class components or function components
export const createElement = (
  component: TinyReact.TagName | Function,
  props: TinyReact.Props,
  children?: Array<TinyReact.Element | string>,
): TinyReact.Element => {
  if (children) {
    props = { ...props, children: ensureChildrenHaveKeys(children) };
  }
  return {
    type: component,
    props: props,
    key: 'key' in props ? props.key : null,
  };
};

const ensureChildrenHaveKeys = (
  children: Array<TinyReact.Element | string>,
) => {
  return children.map((child, index) => {
    if (typeof child === 'string') return child;
    if ('key' in child.props) return child;

    const defaultKey = index.toString();
    child.props.key = defaultKey;
    child.key = defaultKey;

    return child;
  });
};

export default {
  createElement,
  Component,
};
