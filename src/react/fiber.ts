import ClassComponent from './component';
import UpdateScheduler from './update_scheduler';
import TinyReact from './types';
import { getComponentType } from '../shared/utils';

// Fiber is the data structure which holding the react element
// One react element has one corresponding react fiber
class Fiber {
  pendingProps: TinyReact.Props;
  memoizedProps: TinyReact.Props;
  memoizedState: TinyReact.State;
  updateQueue: Array<TinyReact.State>;
  stateNode: TinyReact.Component | HTMLElement | null;
  childrenRenderer: (
    props?: TinyReact.Props,
  ) => TinyReact.ChildrenElements | null;
  element: TinyReact.Element;
  elementType: TinyReact.Element['type'];

  return?: Fiber;
  child?: Fiber;
  sibling?: Fiber;

  effectTag?: TinyReact.EffectTag;
  // These are pointers forming a linked list of fibers represents all the effect that needs to perform
  nextEffect?: Fiber;
  // This is the root of the linked list
  rootEffect?: Fiber;

  constructor(element: TinyReact.Element) {
    // This holding the props of react elemment
    this.pendingProps = element.props;
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
  }

  private createStateNode(element: TinyReact.Element): Fiber['stateNode'] {
    if (this.isClassComponent(element)) {
      //@ts-ignore
      const instance = new element.type();
      instance.props = this.pendingProps;
      instance._internalFiber = this;
      return instance;
    }

    return null;
  }

  private isClassComponent(element: TinyReact.Element) {
    if (typeof element.type === 'string' || element.type === null) return false;

    const componentType = getComponentType(element.type);
    return componentType === 'class';
  }

  private getChildrenRenderer(
    element: TinyReact.Element,
  ): Fiber['childrenRenderer'] {
    const elementType = element.type;
    if (typeof elementType === 'string')
      return () => element.props.children || null;

    const componentType = getComponentType(elementType);
    // @ts-ignore
    if (componentType === 'class') return () => [this.stateNode.render()];

    // @ts-ignore
    return () => [element.type(this.pendingProps)];
  }

  insertNextEffect(fiber: Fiber) {
    if (!this.rootEffect) return (this.rootEffect = fiber);

    let currentFiber = this.rootEffect;
    while (currentFiber.nextEffect) currentFiber = currentFiber.nextEffect;
    return (currentFiber.nextEffect = fiber);
  }

  // This process always begins at the root of the fiber tree
  // The strategy is doing depth first search through child link
  // If reach the leaf node, keep processing with sibling link
  // When there is no sibling left, back off with return link
  // A fiber is consider completed when all of its sub tree is completed

  // In render phase, we will iterate through the whole tree but only work on fibers which
  // are "dirty" (have work to do). When a fiber node is mark "dirty", all of its children will be marked as well
  processRenderPhase() {
    console.log('Begin render phase');
    this.beginWorkOnFiber(this, true);
  }

  // When we begin work on a Fiber, we should first check if there's any work to do
  // If force = true, start the work regardless
  beginWorkOnFiber(fiber: Fiber, force: boolean = false) {
    console.log(`Work begin on fiber:`, fiber);

    if (force || fiber.hasWorkToDo()) fiber.doWork();

    let workInProgressChild = fiber.child;
    while (workInProgressChild) {
      workInProgressChild = fiber.beginWorkOnFiber(workInProgressChild, force);
    }

    // If there is no child left to work on, consider this fiber node as completed
    return this.completeWorkOnFiber(fiber);
  }

  completeWorkOnFiber(fiber: Fiber) {
    console.log(`Work completed on fiber:`, fiber);
    return fiber.sibling;
  }

  hasWorkToDo() {
    return this.updateQueue.length !== 0;
  }

  // In render phase, there are several work to do
  // - getDerivedStateFromProps
  // - shouldComponentUpdate
  // - render
  doWork() {
    console.log('im doing work on:', this);
  }

  enqueueUpdate(changes: TinyReact.State) {
    this.updateQueue.push(changes);
    UpdateScheduler.enqueueUpdate();
  }
}

export const createFiberTree = (rootElement: TinyReact.Element): Fiber => {
  // First we create the fiber node correspond to this element
  const rootFiberNode = createFiberFromElement(rootElement);

  // Then we try to create children of this element according to its type:
  // 1 - Tag name: consult its children props
  // 2 - Class component: invoke its render method
  // 3 - Function component: invoke the function
  const childrenElements =
    typeof rootElement === 'string' ? null : rootFiberNode.childrenRenderer();

  // Try to create fiber node for each child
  const childrenFiberNodes = childrenElements
    ? childrenElements
        .filter(
          (element): element is TinyReact.Element =>
            element !== null && typeof element !== 'string',
        ) // If children of a node is string, don't consider them as a separate node
        .map(createFiberTree)
    : null;

  // console.log(`childrenFiberNodes`, rootFiberNode, childrenFiberNodes);

  // After we get its children fiber nodes, we try to set up pointer for those children
  // - return: pointer from a child to its parent
  // - child: pointer from a parent to its first child
  // - sibling: pointer from one child to one of its sibling (siblings children will form a singly linked list with sibling pointers)
  setUpPointersForFiberNodes(rootFiberNode, childrenFiberNodes);

  // Finally return the root fiber node
  return rootFiberNode;
};

const createFiberFromElement = (element: TinyReact.Element): Fiber => {
  return new Fiber(element);
};

const setUpPointersForFiberNodes = (
  parentNode: Fiber,
  childrenNodes: Fiber[] | null,
) => {
  if (childrenNodes === null) return;
  if (childrenNodes.length === 0) return;

  parentNode.child = childrenNodes[0];

  for (let i = 0; i < childrenNodes.length; i++) {
    childrenNodes[i].return = parentNode;

    if (i !== childrenNodes.length - 1)
      childrenNodes[i].sibling = childrenNodes[i + 1];
  }
};

export const processEffects = (fiberRoot: Fiber) => {
  let currentFiber = fiberRoot.rootEffect;
  while (currentFiber) {
    const { effectTag, nextEffect } = currentFiber;
    processEffect(currentFiber, effectTag);
    currentFiber = nextEffect;
  }
};

export const processEffect = (fiber: Fiber, effect: Fiber['effectTag']) => {
  // console.log(`effect`, effect, fiber);
  if (typeof fiber.elementType === 'string') return;
  const componentType = getComponentType(fiber.elementType);
  if (componentType === 'function') return;
  if (!fiber.stateNode) return;

  const componentInstance = fiber.stateNode as ClassComponent;
  switch (effect) {
    case 'lifecycle:insert': {
      const handler = componentInstance.componentDidMount;
      if (typeof handler === 'function') handler.call(componentInstance);
      break;
    }

    case 'lifecycle:update': {
      const handler = componentInstance.componentDidUpdate;
      if (typeof handler === 'function')
        handler.call(
          componentInstance,
          fiber.memoizedProps,
          fiber.memoizedState,
        );
      break;
    }

    case 'lifecycle:delete': {
      const handler = componentInstance.componentWillUnmount;
      if (typeof handler === 'function') handler.call(componentInstance);
      break;
    }
  }
};

export default Fiber;
