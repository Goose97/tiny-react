import UpdateScheduler from '../react/update_scheduler';
import TinyReact from '../react/types';
import Fiber, { createFiberTree, processEffects } from '../react/fiber';
import { camelCase2KebabCase } from '../shared/utils';

export const render = (
  element: TinyReact.Element,
  rootContainer: HTMLElement,
) => {
  let fiberTree = createFiberTree(element);
  console.log(`fiberTree`, fiberTree);

  // This callback will be invoke whenever a element in
  // the tree invoke setState
  UpdateScheduler.registerCallback(
    fiberTree.processRenderPhase.bind(fiberTree),
  );

  const domTree = createDOMFromFiber(fiberTree, fiberTree);
  console.log(`domTree`, domTree);

  if (domTree) {
    if (typeof domTree === 'string') rootContainer.innerText = domTree;
    rootContainer.append(domTree);

    processEffects(fiberTree);
  }
};

const createDOMFromFiber = (fiber: Fiber, root: Fiber): HTMLElement | null => {
  // This fiber node represents a class (function) component
  // We can safely skip this node since they do not emit DOM node
  // And we can assume they only have one children (React requires this) so just move one to its child
  if (typeof fiber.elementType === 'function') {
    const subFiberTree = fiber.child
      ? createDOMFromFiber(fiber.child, root)
      : null;

    // Mark current fiber node with necessary effect
    fiber.effectTag = 'lifecycle:insert';
    root.insertNextEffect(fiber);

    return subFiberTree;
  }

  // Create the DOM element
  // @ts-ignore
  let domElement = document.createElement(fiber.elementType);

  // Populate its attributes through props
  for (let key in fiber.pendingProps) {
    if (['children'].includes(key)) continue;

    const value = fiber.pendingProps[key];
    domElement.setAttribute(normalizeAttributeKey(key), value);
  }

  if (fiber.child) {
    // Create its children
    let currentChildren: Fiber | undefined = fiber.child;
    while (currentChildren) {
      const result = createDOMFromFiber(currentChildren, root);
      if (result) domElement.appendChild(result);

      currentChildren = currentChildren.sibling;
    }
  } else if (
    fiber.pendingProps?.children?.length === 1 &&
    typeof fiber.pendingProps?.children[0] === 'string'
  ) {
    // Create its text node
    const textNode = document.createTextNode(fiber.pendingProps.children[0]);
    domElement.appendChild(textNode);
  }

  // Store the actual html element so we can perform update later
  fiber.stateNode = domElement;

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
