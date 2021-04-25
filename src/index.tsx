// import React from 'react';
// import ReactDOM from 'react-dom';
// import './index.css';
// import App from './App';
import reportWebVitals from './reportWebVitals';

function createDom(fiber: Fiber) {
  const dom =
    fiber.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);
  
  updateDom(dom, { children: [] }, fiber.props ?? { children: [] });

  return dom;
}

function render(element: DidactElement, container: HTMLElement) {
  wipRoot = {
    type: "ROOT_ELEMENT",
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  }
  deletions = [];
  nextUnitOfWork = wipRoot;
}

let wipRoot: Fiber | undefined = undefined;
let currentRoot: Fiber | undefined = undefined;
let deletions: Fiber[] = [];

const Didact = {
  createElement,
  render,
  useState,
};

let nextUnitOfWork: Fiber | undefined = undefined;

/** @jsx Didact.createElement */
function Counter() {
  const [state, setState] = Didact.useState(1)
  return (
    <h1 onClick={() => setState((c: number) => c + 1)}>Count: {state}</h1>
  )
}

const element = <Counter />;
const container = document.getElementById("root");
if ( container ) {
  Didact.render(element, container);
}

function commitRoot() {
  commitWork(wipRoot?.child);
  currentRoot = wipRoot;
  wipRoot = undefined;
}

const isEvent = (key: string) => key.startsWith("on");
const isProperty = (key: string) => key !== "children" && !isEvent(key);
const isNew = (prev: DidactProps, next: DidactProps) => (key: string) => prev[key] !== next[key];
const isGone = (prev: DidactProps, next: DidactProps) => (key: string) => !(key in next);
function updateDom(dom: HTMLElement | Text, prevProps: DidactProps, nextProps: DidactProps) {
  if (dom instanceof Text) {
    dom.nodeValue = nextProps.nodeValue;
  } else {
    //Remove old or changed event listeners
    Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      key =>
        !(key in nextProps) ||
        isNew(prevProps, nextProps)(key)
    )
    .forEach(name => {
      const eventType = name
        .toLowerCase()
        .substring(2)
      dom.removeEventListener(
        eventType,
        prevProps[name]
      )
    });

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom.setAttribute(name, "");
    });

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom.setAttribute(name, nextProps[name]);
    });

  // Add event listeners
  Object.keys(nextProps)
  .filter(isEvent)
  .filter(isNew(prevProps, nextProps))
  .forEach(name => {
    const eventType = name
      .toLowerCase()
      .substring(2)
    dom.addEventListener(
      eventType,
      nextProps[name]
    )
  });
  }
  
}

const defaultProps: DidactProps = { children: [] };

function commitWork(fiber: Fiber | undefined) {
  if (!fiber) {
    return;
  }

  // DOMノードを持つファイバーが見つかるまでファイバーツリーを上に移動
  let domParentFiber = fiber.parent;
  while (domParentFiber?.dom === undefined) { domParentFiber = domParentFiber?.parent; }
  const domParent = domParentFiber.dom;

  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate?.props ?? defaultProps, fiber.props ?? defaultProps);
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent);
  }
  
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber: Fiber, domParent: HTMLElement | Text) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    fiber.child && commitDeletion(fiber.child, domParent);
  }
}

function workLoop(deadline: IdleDeadline): void {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  requestIdleCallback(workLoop);

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop);

function performUnitOfWork(fiber: Fiber): Fiber | undefined {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }
 
  if (fiber.child) {
    return fiber.child;
　}
　let nextFiber: Fiber | undefined = fiber;
　while (nextFiber) {
    if (nextFiber.sibling) {
    　return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
　}
  return undefined;
}

let wipFiber: Fiber | undefined = undefined;
let hookIndex: number = 0;

function updateFunctionComponent(fiber: Fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

function useState(initial: number) {
  const oldHook = wipFiber?.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };

  const actions = oldHook ? oldHook.queue : []
  actions.forEach((action: any) => {
    hook.state = action(hook.state)
  });


  const setState = (action: never) => {
    hook.queue.push(action);
    wipRoot = {
      type: "ROOT_ELEMENT",
      dom: currentRoot?.dom,
      props: currentRoot?.props ?? null,
      alternate: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  wipFiber?.hooks?.push(hook);
  hookIndex++;
  return [hook.state, setState];
}

function updateHostComponent(fiber: Fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }

  const elements = fiber.props?.children ?? [];
  reconcileChildren(fiber, elements)
}

function reconcileChildren(wipFiber: Fiber, elements: DidactElement[]) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling: Fiber | undefined = undefined;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber: Fiber | undefined = undefined;

    const sameType = oldFiber && element && element.type == oldFiber.type;

    if (sameType) {
      newFiber = {
        type: oldFiber?.type,
        props: element.props,
        dom: oldFiber?.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: undefined,
        parent: wipFiber,
        alternate: undefined,
        effectTag: "PLACEMENT",
      };
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (prevSibling === undefined) {
      wipFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

function createElement(type: string, props: DidactProps, ...children: DidactChild[]) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child: DidactChild) =>
        typeof child === "object"
          ? child
          : createTextElement(child)
      ),
    },
  }
}

function createTextElement(text: string) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

type DidactElement = {
  type: any;
  props: DidactProps | null;
};

type Fiber = {
  type: any;
  props: DidactProps | null;
  dom?: HTMLElement | Text;
  parent?: Fiber;
  sibling?: Fiber;
  child?: Fiber;
  alternate?: Fiber;
  effectTag?: "UPDATE" | "PLACEMENT" | "DELETION";
  hooks?: any[];
}

type DidactProps = {
  children: DidactElement[];
  [key: string]: any;
};

type DidactChild = DidactElement | string;