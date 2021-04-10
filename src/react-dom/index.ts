import UpdateScheduler from '../react/update_scheduler';
import TinyReact from '../react/types';
import Fiber, { createFiberTree, commitEffects } from '../react/fiber';
import { camelCase2KebabCase } from '../shared/utils';

export const render = (
  element: TinyReact.Element,
  rootContainer: HTMLElement,
) => {
  let fiberTree = createFiberTree(element);
  console.log(`fiberTree`, fiberTree);

  // This callback will be invoke whenever a element in
  // the tree invoke setState
  UpdateScheduler.registerCallback(fiberTree.processUpdate.bind(fiberTree));

  const domTree = createDOMFromFiberRecursively(fiberTree, fiberTree);
  console.log(`domTree`, domTree);

  if (domTree) {
    if (typeof domTree === 'string') rootContainer.innerText = domTree;
    rootContainer.append(domTree);

    commitEffects(fiberTree, 'postMutation');
  }
};

const createDOMFromFiberRecursively = (
  fiber: Fiber,
  root: Fiber,
): HTMLElement | Text | null => {
  // This fiber node represents a class (function) component
  // We can safely skip this node since they do not emit DOM node
  // And we can assume they only have one children (React requires this) so just move one to its child
  if (typeof fiber.elementType === 'function') {
    const subFiberTree = fiber.child
      ? createDOMFromFiberRecursively(fiber.child, root)
      : null;

    // Mark current fiber node with necessary effect
    fiber.markEffectTag('lifecycle:insert');
    root.appendNextEffect(fiber);

    return subFiberTree;
  }

  let domElement = createDOMFromFiber(fiber);

  if (fiber.child) {
    // Create its children
    let currentChildren: Fiber | undefined = fiber.child;
    while (currentChildren) {
      const result = createDOMFromFiberRecursively(currentChildren, root);
      if (result) domElement.appendChild(result);

      currentChildren = currentChildren.sibling;
    }
  }

  // Store the actual html element so we can perform update later
  fiber.stateNode = domElement;

  return domElement;
};

export const createDOMFromFiber = (fiber: Fiber) => {
  if (fiber.elementType === null) {
    return document.createTextNode(fiber.textContent!);
  }

  // Create the DOM element
  let domElement = document.createElement(fiber.elementType as string);

  // Populate its attributes through props
  for (let key in fiber.pendingProps) {
    if (['children'].includes(key)) continue;

    const value = fiber.pendingProps[key];
    domElement.setAttribute(normalizeAttributeKey(key), value);
  }

  if (
    fiber.pendingProps?.children?.length === 1 &&
    typeof fiber.pendingProps?.children[0] === 'string'
  ) {
    const textNode = document.createTextNode(fiber.pendingProps.children[0]);
    domElement.appendChild(textNode);
  }

  return domElement;
};

const normalizeAttributeKey = (key: string) => {
  switch (key) {
    case 'className':
      return 'class';

    default:
      return camelCase2KebabCase(key);
  }
};

export default {
  render,
};
