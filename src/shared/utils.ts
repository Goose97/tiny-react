import TinyReact from '../react/types';

// Execellent post from Dan Abramov on how to distinguish class from function
// https://overreacted.io/how-does-react-tell-a-class-from-a-function/
export const getComponentType = (
  component: Function,
): TinyReact.ComponentType => {
  //@ts-ignore
  if (component.prototype.isReactClass) return 'class';
  return 'function';
};

// backgroundColor
export const camelCase2KebabCase = (string: string) => {
  let result = '';
  for (let char of string) {
    if (isUpperCase(char)) result += `-${char.toLocaleLowerCase()}`;
    else result += char;
  }

  return result;
};

const isUpperCase = (char: string) => char.toLocaleUpperCase() === char;
