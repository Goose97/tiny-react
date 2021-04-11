import Fiber, { createFiberFromElement, createFiberFromString } from './fiber';
import TinyReact from './types';
import Logger from '../shared/logger';

let workInProgressRoot: Fiber | null = null;

export const createWorkInProgressTree = (currentTree: Fiber) => {
  // First we create the root of the work in progress tree
  // assign it to the alternate field of current tree's root
  const workInProgressTreeRoot = currentTree.cloneFiber();
  workInProgressRoot = workInProgressTreeRoot;

  // beginProcessFiber(workInProgressTreeRoot);
  workLoop(workInProgressTreeRoot);

  console.log(`workInProgressTreeRoot`, workInProgressTreeRoot);
  console.log(`currentTree`, currentTree);

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

  console.log('Effect chain', result);
};

const workLoop = (fiber: Fiber) => {
  let currentFiber: Fiber | undefined = fiber;

  while (currentFiber) {
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

const completeWork = (fiber: Fiber) => {
  Logger.success(`Work complete on fiber: ${fiber.debugId()}`);
  workInProgressRoot!.appendNextEffect(fiber);
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
  // markEffectTag(fiber);

  // Create children fibers for this fiber
  const children = fiber.childrenRenderer();
  if (!children) return;
  if (children.length === 1 && typeof children[0] === 'string') return;

  console.log(`children`, children, fiber.debugId());
  const childrenFibers = createWorkInProgressChildren(fiber, children);
  if (childrenFibers) fiber.child = childrenFibers;

  console.log(`childrenFibers`, childrenFibers, fiber.debugId());
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

const markEffectTag = (fiber: Fiber, type?: 'insert' | 'delete') => {
  const getType = () => {
    if (type) return type;

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

    return 'update';
  };

  const operationType = getType();
  const elementType = fiber.elementType;
  fiber.markEffectTag(`dom:${operationType}` as TinyReact.EffectTag);
  if (typeof elementType === 'function') {
    Logger.warning('LOOK AT ME');
    Logger.log(fiber, operationType);

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
  const isMatchType = (
    currentTreeChild: Fiber,
    alternateChild: TinyReact.Element | string | undefined,
  ) => {
    if (!alternateChild) return false;
    if (typeof alternateChild === 'string') {
      // String child
      return currentTreeChild
        ? currentTreeChild.elementType === null &&
            currentTreeChild.textContent === alternateChild
        : false;
    } else {
      // Element child
      return alternateChild.type === currentTreeChild?.elementType;
    }
  };

  const createFiberForChildren = (child: TinyReact.Element | string) => {
    const childFiber =
      typeof child === 'string'
        ? createFiberFromString(child)
        : createFiberFromElement(child);
    childFiber.return = fiber;

    return childFiber;
  };

  let childrenLinkedList = null;

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

  // Iterate through children linked list and create alternate node for each child of the
  // current tree. After this comparison, we will have two types of children
  // 1: Matched children: these children should be update in the commit phase
  // 2: Unmatched children in current tree: these children should be delete in the commit phase
  // 3: Unmatched children in work in progress tree: these children should be insert in the commit phase
  // Example:
  // Current tree: 1 -> 2 -> 3 -> 4 -> 5
  // Work in progress tree: 1 -> 2 -> 3 -> 6 -> 4 -> 5
  // After compare, we will have three types of children as listed above:
  // 1: 1 -> 2 -> 3 (update)
  // 2: 4 -> 5 (delete)
  // 2: 6 -> 4 -> 5 (insert)
  let currentChild = currentTreeFiber.child;
  let encounterUnmatch = false;
  let index = 0;
  while (currentChild || index < children.length) {
    const child = children[index];

    // We reach the end of current child linked list
    // No need to compare, just create new fiber for alternate child
    // We're in third type
    if (!currentChild) {
      const childFiber = createFiberForChildren(child);
      markEffectTag(childFiber, 'insert');
      childrenLinkedList = appendSiblingLinkedList(
        childrenLinkedList,
        childFiber,
      );

      index++;
      continue;
    }

    // Compare with the child from alternate tree
    const match = isMatchType(currentChild, child);
    if (!match) encounterUnmatch = true;

    // Once we encounter an unmatched case, its mean the rest of the children of the current tree
    // should be delete in the commit phase
    // We're in second type
    if (encounterUnmatch) {
      // Create a clone fiber and mark them as need delete
      const childFiber = currentChild.cloneFiber();
      markEffectTag(childFiber, 'delete');
      childFiber.return = fiber;
      childrenLinkedList = appendSiblingLinkedList(
        childrenLinkedList,
        childFiber,
      );

      currentChild = currentChild.sibling;
      continue;
    }

    // We're in first type
    const childFiber = createFiberForChildren(child);

    // Set up necessaray pointers
    currentChild.alternate = childFiber;
    childFiber.alternate = currentChild;
    markEffectTag(childFiber);

    childrenLinkedList = appendSiblingLinkedList(
      childrenLinkedList,
      childFiber,
    );

    // Advance pointer and counter
    currentChild = currentChild.sibling;
    index++;
  }

  return childrenLinkedList;
};

const appendSiblingLinkedList = (head: Fiber | null, fiber: Fiber) => {
  if (!head) return fiber;

  let currentFiber = head;
  while (currentFiber.sibling) {
    currentFiber = currentFiber.sibling;
  }

  currentFiber.sibling = fiber;

  return head;
};
