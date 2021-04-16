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

export const blockFor = (duration: number) => {
  const deadline = new Date().getTime() + duration;
  while (true) {
    const current = new Date().getTime();
    if (current > deadline) break;
  }
};

// The array is guarantee to be unique
export const longestIncreasingSubsequence = <T>(
  array: Array<{ order: number; value: T }>,
) => {
  if (array.length === 0)
    throw new Error('longestIncreasingSubsequence does not accept empty array');

  let memoize: { [key: number]: [number, number] } = {};
  // Let's call longestIncreasingSubsequence as LIS for short
  function LISEndingAt(index: number): [number, number] {
    if (memoize[index]) return memoize[index];

    let currentBest = 1;
    let currentBestEndingIndex = index;
    for (let i = 0; i < index; i++) {
      const orderInIndex = array[index] ? array[index].order : Infinity;
      if (array[i].order > orderInIndex) continue;
      const [bestEndingAtI, _] = LISEndingAt(i);
      if (bestEndingAtI + 1 > currentBest) {
        currentBest = bestEndingAtI + 1;
        currentBestEndingIndex = i;
      }
    }

    memoize[index] = [currentBest, currentBestEndingIndex];
    return [currentBest, currentBestEndingIndex];
  }

  const endingIndex = LISEndingAt(array.length)[1];
  let result = [array[endingIndex]];
  let current = endingIndex;
  while (true) {
    const next = memoize[current][1];
    if (next === current) break;

    result.unshift(array[next]);
    current = next;
  }

  return result;
};