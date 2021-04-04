import TinyReact from './types';
import Component from './component';

// This function is meant to create a react element,
// either from class components or function components
export const createElement = (
  component: TinyReact.TagName | Function,
  props: TinyReact.Props,
  children?: Array<TinyReact.Element | string>,
): TinyReact.Element => {
  if (children) props = { ...props, children };
  return {
    type: component,
    props: props,
    key: 'key' in props ? props.key : null,
  };
};

export default {
  createElement,
  Component,
};
