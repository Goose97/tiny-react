import UpdateScheduler from '../react/update_scheduler';
import TinyReact from '../react/types';
import Fiber, { createFiberTree } from '../react/fiber';
import { commitEffects } from '../react/reconciler';
import { camelCase2KebabCase } from '../shared/utils';

export const render = (
  element: TinyReact.Element,
  rootContainer: HTMLElement,
) => {
  let fiberTree = createFiberTree(element);
  console.log(`fiberTree`, fiberTree);

  // This callback will be invoke whenever a element in
  // the tree invoke setState
  UpdateScheduler.setCurrentTree(fiberTree);

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

  return domElement;
};

export const createDOMFromFiber = (fiber: Fiber) => {
  let domNode;

  if (fiber.elementType === null) {
    domNode = document.createTextNode(fiber.textContent!);
  } else {
    // Create the DOM element
    domNode = document.createElement(fiber.elementType as string);

    // Populate its attributes through props
    for (let key in fiber.memoizedProps) {
      const value = fiber.memoizedProps[key];
      if (['onClick', 'onChange'].includes(key)) {
        attachEventListener(domNode, key, value);
        continue;
      }

      if (['children', 'key'].includes(key)) continue;

      domNode.setAttribute(normalizeAttributeKey(key), value);
    }
  }

  // Store the actual html element so we can perform update later
  fiber.stateNode = domNode;

  return domNode;
};

const attachEventListener = (
  domNode: HTMLElement | Text,
  attribute: string,
  handler: any,
) => {
  if (typeof handler !== 'function') return;
  let event = getEventNameFromAttributeName(attribute);
  if (event) domNode.addEventListener(event, handler);
};

export const getEventNameFromAttributeName = (attribute: string) => {
  switch (attribute) {
    case 'onClick':
      return 'click';
    case 'onChange':
      return 'change';
    default:
      return null;
  }
};

export const normalizeAttributeKey = (key: string) => {
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
