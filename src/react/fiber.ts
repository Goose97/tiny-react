import { cloneDeep, omit } from 'lodash';

import ClassComponent from './component';
import { createWorkInProgressTree, commitEffects } from './reconciler';
import UpdateScheduler from './update_scheduler';
import TinyReact from './types';
import { getComponentType } from '../shared/utils';
import Logger from '../shared/logger';

// Fiber is the data structure which holding the react element
// One react element has one corresponding react fiber
class Fiber {
  pendingProps: TinyReact.Props;
  memoizedProps: TinyReact.Props;
  memoizedState: TinyReact.State;
  updateQueue: Array<TinyReact.State>;
  stateNode: TinyReact.Component | HTMLElement | Text | null;
  childrenRenderer: (
    props?: TinyReact.Props,
  ) => TinyReact.ChildrenElements | null;
  key: string | null;
  element: TinyReact.Element;
  elementType: TinyReact.Element['type'];

  textContent?: string;

  return?: Fiber;
  child?: Fiber;
  sibling?: Fiber;
  previousSibling?: Fiber;

  effectTag: Set<TinyReact.EffectTag>;
  // These are pointers forming a linked list of fibers represents all the effect that needs to perform
  nextEffect?: Fiber;
  // This is the root of the linked list
  rootEffect?: Fiber;

  // This is the reference to the alternate tree during render phase
  alternate?: Fiber;

  // This is useful in commit phase when we building the html tree from bottom up
  // This is the html element which a fiber produce when they are rendered to the screen
  output?: HTMLElement | Text;

  // This serves iteration purpose in render phase
  visited?: boolean;
  recreatingSubtree?: boolean;

  constructor(element: TinyReact.Element) {
    // Key of children reconcilation
    this.key = element.key;

    // This holding the props of react elemment
    this.pendingProps = {};
    this.memoizedProps = element.props;

    // This holding the state changes which are not yet to be applied
    this.updateQueue = [];

    // Consider this as a storage for local state
    // For a class component, it is the class instance.
    // For a tag name node, it is the corresponding html element
    // For a function component, it is null since a function component does not have local state
    this.stateNode = this.createStateNode(element);

    this.memoizedState = this.isClassComponent(element)
      ? (this.stateNode as ClassComponent).state
      : null;

    // The corresponding React element
    this.element = element;

    // Type of the fiber node
    this.elementType = element.type;

    // Render is invoking when you want to get the children element of the element
    // this fiber node represents
    this.childrenRenderer = this.getChildrenRenderer(element);

    this.textContent = element.textContent;
    this.effectTag = new Set();
  }

  createStateNode(element: TinyReact.Element): Fiber['stateNode'] {
    if (this.isClassComponent(element)) {
      //@ts-ignore
      const instance = new element.type();
      instance.props = this.memoizedProps;
      instance._internalFiber = this;
      return instance;
    }

    return null;
  }

  isClassComponent(element: TinyReact.Element) {
    if (typeof element.type === 'string' || element.type === null) return false;

    const componentType = getComponentType(element.type as Function);
    return componentType === 'class';
  }

  getChildrenRenderer(element: TinyReact.Element): Fiber['childrenRenderer'] {
    const elementType = element.type;
    if (typeof elementType === 'string')
      return () => element.props.children || null;

    if (elementType === null) return () => null;

    const componentType = getComponentType(elementType as Function);

    // @ts-ignore
    if (componentType === 'class') return () => [this.stateNode.render()];

    // @ts-ignore
    return () => [element.type(this.memoizedProps)];
  }

  appendNextEffect(fiber: Fiber) {
    if (!this.rootEffect) return (this.rootEffect = fiber);

    let currentFiber = this.rootEffect;
    while (currentFiber.nextEffect) currentFiber = currentFiber.nextEffect;
    return (currentFiber.nextEffect = fiber);
  }

  // This process always begins at the root of the fiber tree
  // The strategy is doing depth first search through child link
  // If reach the leaf node, keep processing with sibling link
  // When there is no sibling left, back off with return link
  // A fiber is consider completed when all of its sub-tree is completed

  // In render phase, we will iterate through the whole tree but only work on fibers which
  // are "dirty" (have work to do). When a fiber node is mark "dirty", all of its children will be marked as well
  async processUpdate() {
    Logger.success('BEGIN RENDER PROCESS UPDATE');
    // First we create the root of the work in progress tree
    // assign it to the alternate field of current tree's root
    // This can be refer as render phase
    const workInProgressTree = await createWorkInProgressTree(this);

    // Commit all existing effects on work in progress tree
    // This can refer as commit phase
    commitEffects(workInProgressTree, 'preMutation');
    commitEffects(workInProgressTree, 'mutation');
    commitEffects(workInProgressTree, 'postMutation');

    // Set the work in progress tree as the current tree
    UpdateScheduler.setCurrentTree(workInProgressTree);
  }

  // In render phase, there will be two versions of fiber tree exist
  // Current tree and work in progress tree (this tree reflects future changes)
  // Each node in the current tree will hold a reference to the corresponding node in the workInProgressTree
  // through alternate field and vice versa
  cloneFiber(): Fiber {
    const omitFields = [
      'child',
      'return',
      'sibling',
      'effectTag',
      'rootEffect',
      'nextEffect',
      'alternate',
      'stateNode',
    ];
    let alternateNode = cloneDeep(omit(this, omitFields)) as Fiber;

    // Reset some fields
    alternateNode.effectTag = new Set();
    alternateNode.visited = false;

    // Set up alternate pointer
    alternateNode.alternate = this;
    this.alternate = alternateNode;

    // Reuse the class instance
    alternateNode.stateNode = this.stateNode;

    return alternateNode;
  }

  flushUpdateQueue() {
    if (!this.stateNode || !this.updateQueue.length) return;

    let batchedUpdate = Object.assign({}, ...this.updateQueue);
    const newState = { ...this.memoizedState, ...batchedUpdate };
    if ('state' in this.stateNode) this.stateNode.state = newState;
    this.updateQueue = [];
  }

  enqueueUpdate(changes: TinyReact.State) {
    this.updateQueue.push(changes);
    UpdateScheduler.enqueueUpdate();
  }

  markEffectTag(tag: TinyReact.EffectTag) {
    this.effectTag.add(tag);
  }

  debugId() {
    const id =
      this.pendingProps.id || this.memoizedProps.id || this.textContent;
    if (!id) Logger.log('Can not get debug ID', this);
    return id;
  }
}

export const createFiberTree = (rootElement: TinyReact.Element): Fiber => {
  // First we create the correspond fiber node of this element
  const rootFiberNode = createFiberFromElement(rootElement);

  // Then we try to create children of this element according to its type:
  // 1 - Tag name: consult its children props
  // 2 - Class component: invoke its render method
  // 3 - Function component: invoke the function
  const childrenElements =
    typeof rootElement === 'string' ? null : rootFiberNode.childrenRenderer();

  // Try to create fiber node for each child
  let childrenFiberNodes: Fiber[] = [];
  if (childrenElements) {
    childrenFiberNodes = childrenElements
      .map(element => {
        if (element === null) return null;
        if (typeof element === 'string') return createFiberFromString(element);

        return createFiberTree(element);
      })
      .filter((element): element is Fiber => element !== null);
  }

  // After we get its children fiber nodes, we try to set up pointer for those children
  // - return: pointer from a child to its parent
  // - child: pointer from a parent to its first child
  // - sibling: pointer from one child to one of its sibling (siblings children will form a singly linked list with sibling pointers)
  setUpPointersForFiberNodes(rootFiberNode, childrenFiberNodes);

  // Finally return the root fiber node
  return rootFiberNode;
};

export const createFiberFromElement = (element: TinyReact.Element): Fiber => {
  return new Fiber(element);
};

export const createFiberFromString = (string: string): Fiber => {
  return new Fiber({
    type: null,
    props: {},
    key: null,
    textContent: string,
  });
};

const setUpPointersForFiberNodes = (
  parentNode: Fiber,
  childrenNodes: Fiber[],
) => {
  if (childrenNodes.length === 0) return;

  parentNode.child = childrenNodes[0];

  for (let i = 0; i < childrenNodes.length; i++) {
    childrenNodes[i].return = parentNode;

    if (i !== childrenNodes.length - 1) {
      childrenNodes[i].sibling = childrenNodes[i + 1];
      childrenNodes[i + 1].previousSibling = childrenNodes[i];
    }
  }
};

// Walk down the child link and find the first fiber which output html
export const getNearestElementDescendant = (
  fiber: Fiber,
): Exclude<Fiber['stateNode'], TinyReact.Component> => {
  let currentChild = fiber.child;
  if (isFiberOutputHTMLElement(fiber))
    return fiber.stateNode as HTMLElement | Text;

  while (currentChild) {
    if (isFiberOutputHTMLElement(currentChild))
      return currentChild.stateNode as HTMLElement | Text;

    currentChild = currentChild.child;
  }

  return null;
};

export const getNearestElementAncestor = (
  fiber: Fiber,
): Exclude<Fiber['stateNode'], TinyReact.Component> => {
  let currentFiber: Fiber | undefined = fiber.return;
  while (currentFiber) {
    if (isFiberOutputHTMLElement(currentFiber))
      return currentFiber.stateNode as HTMLElement | Text;

    currentFiber = fiber.return;
  }

  return null;
};

const isFiberOutputHTMLElement = (fiber: Fiber) => {
  return typeof fiber.elementType === 'string' || fiber.elementType === null;
};

// Return true if successfully insert the node
// Otherwise return false
export const insertAfterFiber = (
  htmlElement: HTMLElement | Text,
  fiber: Fiber,
) => {
  const fiberOutput = getNearestElementDescendant(fiber);
  if (!fiberOutput) return false;

  fiberOutput.parentNode?.insertBefore(htmlElement, fiberOutput.nextSibling);
  return true;
};

export const iterateFiber = (
  fiber: Fiber | undefined,
  iterationKey:
    | 'sibling'
    | 'previousSibling'
    | 'child'
    | 'return'
    | 'nextEffect',
  callback: (child: Fiber) => boolean,
) => {
  let currentChild: Fiber | undefined = fiber;
  while (currentChild) {
    const isYield = callback(currentChild);
    if (isYield) break;

    currentChild = currentChild[iterationKey];
  }
};

export default Fiber;
