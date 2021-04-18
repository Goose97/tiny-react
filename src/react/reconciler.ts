import { pick } from 'lodash';

import ClassComponent from './component';
import Fiber, {
  createFiberFromElement,
  createFiberFromString,
  getNearestElementDescendant,
  getNearestElementAncestor,
  insertAfterFiber,
  iterateFiber,
} from './fiber';
import {
  createDOMFromFiber,
  normalizeAttributeKey,
  getEventNameFromAttributeName,
} from '../react-dom';
import {
  getComponentType,
  longestIncreasingSubsequence,
} from '../shared/utils';
import TinyReact from './types';
import Logger from '../shared/logger';

let workInProgressRoot: Fiber | null = null;

export const createWorkInProgressTree = async (currentTree: Fiber) => {
  // First we create the root of the work in progress tree
  // assign it to the alternate field of current tree's root
  const workInProgressTreeRoot = currentTree.cloneFiber();
  workInProgressRoot = workInProgressTreeRoot;

  // beginProcessFiber(workInProgressTreeRoot);
  await workLoop(workInProgressTreeRoot);

  Logger.log(`workInProgressTreeRoot`, workInProgressTreeRoot);
  Logger.log(`currentTree`, currentTree);

  printEffectChain(workInProgressTreeRoot);

  workInProgressRoot = null;

  return workInProgressTreeRoot;
};

const printEffectChain = (fiber: Fiber) => {
  let result = [];
  let current: Fiber | undefined = fiber.rootEffect;

  while (current) {
    result.push(current.debugId(), Array.from(current.effectTag));
    current = current.nextEffect;
  }

  Logger.log('Effect chain', result);
};

const workLoop = async (fiber: Fiber) => {
  let currentFiber: Fiber | undefined = fiber;

  while (currentFiber) {
    // await waitTillBrowserIdle();

    if (currentFiber.visited) {
      const nextFiber = completeWork(currentFiber);
      currentFiber = nextFiber;
      continue;
    } else {
      Logger.success(`Process fiber: ${currentFiber.debugId()}`);
      processFiber(currentFiber);
    }

    if (currentFiber.child) {
      currentFiber = currentFiber.child;
      continue;
    }

    const nextFiber = completeWork(currentFiber);
    currentFiber = nextFiber;
  }
};

const waitTillBrowserIdle = () => {
  // @ts-ignore
  if (typeof window.requestIdleCallback === 'function') {
    return new Promise(resolve => {
      // @ts-ignore
      window.requestIdleCallback(resolve);
    });
  } else {
    return Promise.resolve();
  }
};

const completeWork = (fiber: Fiber) => {
  Logger.success(`Work complete on fiber: ${fiber.debugId()}`);
  if (fiber.effectTag.size !== 0) workInProgressRoot!.appendNextEffect(fiber);
  fiber.inWork = false;
  return fiber.sibling || fiber.return;
};

const processFiber = (fiber: Fiber) => {
  fiber.visited = true;

  if (hasWorkToDo(fiber)) {
    fiber.inWork = true;
    Logger.success(`Work begin on fiber: ${fiber.debugId()}`);
    doWork(fiber);
  } else {
    // If there's no work to do, simply copy the children from the
    // current tree to the work in progress tree

    // Each fiber node enter this function is guarantee to have an alternate node point to the current tree
    // If not then it should be a bug
    let currentTreeNode = fiber.alternate!;
    cloneChildren(currentTreeNode, fiber);

    // Iterate to check if any child fiber has work to do
    iterateFiber(fiber.child, 'sibling', child => {
      if (hasWorkToDo(child)) markEffectTag(child, 'update');
      return false;
    });
  }
};

const hasWorkToDo = (fiber: Fiber) => {
  const isParentInWork = !!fiber.return?.inWork;
  const isCurrentHasWork = fiber.updateQueue.length !== 0;
  return isParentInWork || isCurrentHasWork;
};

// In render phase, there are several work to do
// - getDerivedStateFromProps
// - shouldComponentUpdate
// - render
const doWork = (fiber: Fiber) => {
  fiber.flushUpdateQueue();

  // Create children fibers for this fiber
  const children = fiber.childrenRenderer();
  if (!children) return;

  Logger.log(`children`, children, fiber.debugId());
  const childrenFibers = createWorkInProgressChildren(fiber, children);
  if (childrenFibers) fiber.child = childrenFibers;

  Logger.log(`childrenFibers`, childrenFibers, fiber.debugId());
};

// Iterate through the children linked list and create an alternate node for each
const cloneChildren = (source: Fiber, target: Fiber) => {
  let head = source;
  let targetHead = target;
  while (true) {
    const isParent = source === head;
    const nextPointer = isParent ? 'child' : 'sibling';
    let next = source[nextPointer];
    if (!next) break;

    let alternateNext = next.cloneFiber();
    alternateNext.return = targetHead;
    target[nextPointer] = alternateNext;

    // Advance pointers
    source = next;
    target = alternateNext;
  }
};

const markEffectTag = (
  fiber: Fiber,
  type: 'insert' | 'delete' | 'update' | 'rearrange',
) => {
  const getType = () => {
    // Inherit some effect tags from parent
    const parentEffectTag = fiber.return!.effectTag;
    if (
      parentEffectTag.has('dom:insert') ||
      parentEffectTag.has('lifecycle:insert')
    )
      return 'insert';

    if (
      parentEffectTag.has('dom:delete') ||
      parentEffectTag.has('lifecycle:delete')
    )
      return 'delete';

    return type;
  };

  const operationType = getType();
  const elementType = fiber.elementType;
  fiber.markEffectTag(`dom:${operationType}` as TinyReact.EffectTag);
  if (typeof elementType === 'function') {
    fiber.markEffectTag(`lifecycle:${operationType}` as TinyReact.EffectTag);
  }
};

// Compare the children of current tree with the newly rendered children
// Try to match child by their type, children can be inserted, deleted or updated between
// two trees
// We start matching from the left most child. If we encounter a unmatched child, marked
// the rest as unmatched
const createWorkInProgressChildren = (
  fiber: Fiber,
  children: TinyReact.ChildrenElements,
): Fiber | null => {
  // Iterate over the current children list to find the match one
  const findMatchFiber = (
    currentTreeFiber: Fiber,
    workInProgressChild: TinyReact.Element | string,
  ) => {
    let currentChild = currentTreeFiber.child;
    while (currentChild) {
      const result = isFiberMatch(currentChild, workInProgressChild);
      if (result) return currentChild;
      else currentChild = currentChild.sibling;
    }
  };

  const isFiberMatch = (
    fiber: Fiber,
    childElement: TinyReact.Element | string,
  ) => {
    let matchCallback;
    // In case of a text node
    if (typeof childElement === 'string') {
      matchCallback = (childFiber: Fiber) =>
        childFiber.elementType === null &&
        childFiber.textContent === childElement;
    } else {
      matchCallback = (childFiber: Fiber) => {
        const isKeyEqual = childElement.key === childFiber.key;
        const isTypeMatch = childElement.type === childFiber.elementType;
        return isKeyEqual && isTypeMatch;
      };
    }

    return matchCallback(fiber);
  };

  const createFiberForChildren = (child: TinyReact.Element | string) => {
    const childFiber =
      typeof child === 'string'
        ? createFiberFromString(child)
        : createFiberFromElement(child);
    childFiber.return = fiber;

    return childFiber;
  };

  let childrenLinkedList: Fiber | null = null;
  const currentTreeFiber = fiber.alternate;
  if (!currentTreeFiber) {
    // No alternate fiber in the current tree means this fiber is
    // new fiber which will get insert in the commit phase
    for (let child of children) {
      const childFiber = createFiberForChildren(child);
      markEffectTag(childFiber, 'insert');
      childrenLinkedList = appendSiblingLinkedList(
        childrenLinkedList,
        childFiber,
      );
    }

    return childrenLinkedList;
  }

  // There are four type of element in this phase
  // 1 - Elements exist in both tree --> update
  // 2 - Elements exist in both tree, but relative position changes --> rearrange
  // 3 - Elements exist in work in progress tree but not in current tree --> insert
  // 4 - Elements exist in current tree but not in work in progress tree -> delete

  // Walk through work in progress list first, match existing fiber in current children list
  // Store the key list
  let matchedCurrentFiber: Set<Fiber> = new Set([]);

  // Store which current fiber matches with work in progress fiber
  let matchedFiberPairs: Map<Fiber, Fiber> = new Map();

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const matchFiberFromCurrentTree = findMatchFiber(currentTreeFiber, child);
    if (matchFiberFromCurrentTree)
      matchedCurrentFiber.add(matchFiberFromCurrentTree);

    // We're in third case
    if (!matchFiberFromCurrentTree) {
      const newChildFiber = createFiberForChildren(child);
      markEffectTag(newChildFiber, 'insert');
      childrenLinkedList = appendSiblingLinkedList(
        childrenLinkedList,
        newChildFiber,
      );
      continue;
    }

    // We're in first and second case. It's an update, we should clone the fiber
    // But we should update the children renderer
    let newChildFiber = matchFiberFromCurrentTree.cloneFiber();
    matchedFiberPairs.set(newChildFiber, matchFiberFromCurrentTree);
    Object.assign(
      newChildFiber,
      pick(createFiberForChildren(child), ['childrenRenderer']),
    );
    newChildFiber.pendingProps = typeof child === 'string' ? {} : child.props;

    // Set up necessaray pointers
    newChildFiber.return = fiber;
    matchFiberFromCurrentTree.alternate = newChildFiber;
    newChildFiber.alternate = matchFiberFromCurrentTree;

    childrenLinkedList = appendSiblingLinkedList(
      childrenLinkedList,
      newChildFiber,
    );

    continue;
  }

  // Then walk through the current list, check if any element does not exist in the work
  // in progress tree anymore. If so, mark them as need delete
  iterateFiber(currentTreeFiber.child, 'sibling', child => {
    if (!matchedCurrentFiber.has(child)) {
      // We're in fourth type
      // Create a clone fiber and mark them as need delete
      const newChildFiber = child.cloneFiber();
      newChildFiber.return = fiber;
      markEffectTag(newChildFiber, 'delete');
      childrenLinkedList = appendSiblingLinkedList(
        childrenLinkedList,
        newChildFiber,
      );
    }

    return false;
  });

  if (currentTreeFiber.child && childrenLinkedList)
    scheduleArrangeForChildren(
      currentTreeFiber.child,
      childrenLinkedList,
      matchedFiberPairs,
    );

  return childrenLinkedList;
};

// We have a two list of fiber, a current one and a working in progress one
// Figure out a way to efficiently rearrange the current one to transform it
const scheduleArrangeForChildren = (
  currentChildren: Fiber,
  newChildren: Fiber,
  matchedFiberPairs: Map<Fiber, Fiber>,
) => {
  // List of fibers which relative positions remain the same
  let unchangedFibers = getLongestUnchangedFiberSequence(
    currentChildren,
    newChildren,
    matchedFiberPairs,
  );

  iterateFiber(newChildren, 'sibling', child => {
    const ignoreEffectTag: TinyReact.EffectTag[] = [
      'dom:insert',
      'lifecycle:insert',
      'dom:delete',
      'lifecycle:delete',
    ];
    if (ignoreEffectTag.some(effect => child.effectTag.has(effect)))
      return false;

    markEffectTag(child, unchangedFibers.has(child) ? 'update' : 'rearrange');
    return false;
  });
};

const getLongestUnchangedFiberSequence = (
  currentFiber: Fiber,
  newFiber: Fiber,
  matchedFiberPairs: Map<Fiber, Fiber>,
) => {
  let fiberIndexMap: Map<Fiber, number> = new Map();
  let index = 0;
  iterateFiber(currentFiber, 'sibling', child => {
    fiberIndexMap.set(child, index);
    index++;
    return false;
  });

  let fiberWithIndex: Array<{ order: number; value: Fiber }> = [];
  iterateFiber(newFiber, 'sibling', child => {
    const currentFiberMatchThisChild = matchedFiberPairs.get(child);
    if (currentFiberMatchThisChild) {
      const indexInCurrentTree = fiberIndexMap.get(currentFiberMatchThisChild);
      if (indexInCurrentTree !== undefined)
        fiberWithIndex.push({
          order: indexInCurrentTree,
          value: child,
        });
    }

    return false;
  });

  if (fiberWithIndex.length === 0) return new Set([]);

  const longestUnchangedFiberSequenceIndex = longestIncreasingSubsequence<Fiber>(
    fiberWithIndex,
  );
  return new Set(longestUnchangedFiberSequenceIndex.map(({ value }) => value));
};

const appendSiblingLinkedList = (head: Fiber | null, fiber: Fiber) => {
  if (!head) return fiber;

  let currentFiber = head;
  while (currentFiber.sibling) {
    currentFiber = currentFiber.sibling;
  }

  currentFiber.sibling = fiber;
  fiber.previousSibling = currentFiber;

  return head;
};

export const commitEffects = (
  fiberRoot: Fiber,
  type: 'preMutation' | 'mutation' | 'postMutation',
) => {
  Logger.success(`BEGIN PROCESSING ${type}`);

  let handler: (fiber: Fiber) => void;
  switch (type) {
    case 'preMutation':
      handler = commitPreMutationEffect;
      break;
    case 'mutation':
      handler = commitMutation;
      break;
    case 'postMutation':
      handler = commitPostMutationEffect;
      break;
  }

  iterateFiber(fiberRoot.rootEffect, 'nextEffect', fiber => {
    handler(fiber);
    return false;
  });
};

const commitPreMutationEffect = (fiber: Fiber) => {};

const commitMutation = (fiber: Fiber) => {
  const log = (effect: any) => {
    Logger.log('Processing mutation effect', effect, fiber.debugId());
  };

  if (fiber.effectTag.has('dom:insert')) {
    log('dom:insert');
    return commitInsert(fiber);
  }

  if (fiber.effectTag.has('dom:delete')) {
    log('dom:delete');
    return commitDelete(fiber);
  }

  if (fiber.effectTag.has('dom:update')) {
    log('dom:update');
    return commitUpdate(fiber);
  }

  if (fiber.effectTag.has('dom:rearrange')) {
    log('dom:rearrange');
    commitUpdate(fiber);
    return commitRearrange(fiber);
  }
};

const commitInsert = (fiber: Fiber) => {
  const mountToParent = (htmlElement: HTMLElement | Text) => {
    let mountSuccess = false;

    iterateFiber(fiber.previousSibling, 'previousSibling', child => {
      const success = insertAfterFiber(htmlElement, child);
      if (success) mountSuccess = true;
      return success;
    });

    // This is when we can not find any sibling to insert after
    // Append to the parent
    if (!mountSuccess) {
      const parentElement = getNearestElementAncestor(fiber);
      if (parentElement instanceof HTMLElement) {
        parentElement.prepend(htmlElement);
      }
    }
  };

  // If this fiber is the component type, it does not emit any HTML
  // Just take the output of your child (these components are guarantee to have only one child)
  if (typeof fiber.elementType === 'function') {
    fiber.output = fiber.child?.output;
    return;
  }

  // First create the HTML element
  let htmlElement = createDOMFromFiber(fiber);

  // Append all of your children
  let currentChild = fiber.child;
  while (currentChild) {
    if (currentChild.output) htmlElement.appendChild(currentChild.output);
    currentChild = currentChild.sibling;
  }

  // Save the HTML which this fiber emits
  fiber.output = htmlElement;

  // Check if you parent already mounted on the DOM (there are no effect related to insert)
  // If so, append yourself to the parent children list
  const parentEffectTag = fiber.return?.effectTag;
  if (
    !parentEffectTag?.has('lifecycle:insert') &&
    !parentEffectTag?.has('dom:insert')
  ) {
    mountToParent(htmlElement);
  }
};

const commitDelete = (fiber: Fiber) => {
  // We should handle delete in a different manner
  // In case the parent of this fiber is also about to be deleted, delete the
  // parent is suffice (minimize the amount of DOM operations)
  const parentEffectTag = fiber.return?.effectTag;
  if (
    parentEffectTag?.has('lifecycle:delete') ||
    parentEffectTag?.has('dom:delete')
  ) {
    Logger.warning('RETURN BECAUSE PARENT SHOULD BE DELETE');
    Logger.log(fiber.debugId());
    return;
  }

  if (
    fiber.stateNode instanceof HTMLElement ||
    fiber.stateNode instanceof Text
  ) {
    const parentNode = fiber.stateNode.parentNode;
    if (parentNode) parentNode.removeChild(fiber.stateNode);
  }
};

const commitUpdate = (fiber: Fiber) => {
  if (!(fiber.stateNode instanceof HTMLElement)) return;

  // Checking if this fiber needs any update
  // There are two types of update:
  // 1 - Property update
  // 2 - Inner text update
  for (let [key, value] of Object.entries(fiber.pendingProps)) {
    if (['children'].includes(key)) continue;
    const currentValue = fiber.memoizedProps[key];
    if (currentValue !== value) {
      // Detach old event listener and attach new one
      if (['onClick', 'onChange'].includes(key)) {
        const eventName = getEventNameFromAttributeName(key);
        if (eventName) {
          fiber.stateNode.removeEventListener(eventName, currentValue);
          fiber.stateNode.addEventListener(eventName, value);
        }
        continue;
      }

      fiber.stateNode.setAttribute(normalizeAttributeKey(key), value);
    }
  }
};

const commitRearrange = (fiber: Fiber) => {
  if (
    !(fiber.stateNode instanceof HTMLElement || fiber.stateNode instanceof Text)
  )
    return;

  let currentSibling = fiber.previousSibling;
  while (currentSibling) {
    //@ts-ignore
    const success = insertAfterFiber(fiber.stateNode, currentSibling);
    if (success) return;
    currentSibling = currentSibling?.previousSibling;
  }

  // If can not find a previous sibling to insert, prepend to parent
  const parentElement = getNearestElementAncestor(fiber);
  if (parentElement instanceof HTMLElement)
    parentElement.prepend(fiber.stateNode);
};

const commitPostMutationEffect = (fiber: Fiber) => {
  const log = (effect: any) => {
    Logger.log('Processing post mutation effect', effect, fiber.debugId());
  };

  if (typeof fiber.elementType === 'string' || fiber.elementType === null)
    return;
  const componentType = getComponentType(fiber.elementType as Function);
  if (componentType === 'function') return;
  if (!fiber.stateNode) return;
  const componentInstance = fiber.stateNode as ClassComponent;

  if (fiber.effectTag.has('lifecycle:insert')) {
    log('lifecycle:insert');

    const handler = componentInstance.componentDidMount;
    if (typeof handler === 'function') handler.call(componentInstance);
    return;
  }

  if (fiber.effectTag.has('lifecycle:update')) {
    log('lifecycle:update');

    const handler = componentInstance.componentDidUpdate;
    if (typeof handler === 'function')
      handler.call(componentInstance, fiber.memoizedProps, fiber.memoizedState);

    fiber.memoizedProps = fiber.pendingProps;
    fiber.pendingProps = {};

    // @ts-ignore
    fiber.stateNode._internalFiber = fiber;

    return;
  }

  if (fiber.effectTag.has('lifecycle:delete')) {
    log('lifecycle:delete');

    const handler = componentInstance.componentWillUnmount;
    if (typeof handler === 'function') handler.call(componentInstance);
    return;
  }
};
