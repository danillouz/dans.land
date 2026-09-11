---
title: Node.js event loop
description: AWS Lambda can freeze and thaw its execution context, which can impact Node.js event loop behavior.
created: 2019-05-30
updated: 2026-09-11
status: evergreen
---

One of the more surprising things I learned recently while working with AWS Lambda is how it interacts with the Node.js event loop.

Lambda is powered by a [virtualization technology](https://aws.amazon.com/blogs/aws/firecracker-lightweight-virtualization-for-serverless-computing),
and to optimize performance it can "freeze" and "thaw" the execution context of your code so it can be reused.

This can avoid initialization work, but can also impact the expected event loop behavior.
We'll explore this in detail.
But let's quickly refresh the Node.js concurrency model.

> [!note] Already familiar with the event loop?
>
> Go straight to the [[#AWS Lambda]] section.

## Concurrency model

Node.js is _single threaded_ and the [event loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick) is the concurrency model that allows non-blocking I/O operations to be performed by offloading operations to the system kernel whenever possible.

How? Well, we'll have to discuss the call stack and the task queue first.

### Call stack

Function calls form a _stack of frames_, where each frame represents a single function call.

Every time a function is called, it's _pushed_ onto the stack (i.e. added to the stack).
When the function is done executing, it's _popped_ off the stack (i.e. removed from the stack).

The frames in a stack are popped off in <abbr title="Last In First Out">LIFO</abbr> order.

![Call stack frames are added last and removed first](../_assets/nodejs-event-loop/call-stack.png)

Each frame stores information about the invoked function.
Like the arguments the function was called with and any variables defined inside the called function's body.

When we execute the following code:

```js showLineNumbers
"use strict"

function work() {
  console.log("do work")
}

function main() {
  console.log("main start")
  work()
  console.log("main end")
}

main()
```

We can visualize the call stack over time like this.

![Call stack states 1-3: empty, main, then console above main](../_assets/nodejs-event-loop/call-stack/1.png)

1. When the script starts executing, the call stack is empty.

2. `main()` is called and pushed onto the call stack:

   ```js showLineNumbers {13}
   "use strict"

   function work() {
     console.log("do work")
   }

   function main() {
     console.log("main start")
     work()
     console.log("main end")
   }

   main()
   ```

3. While executing `main`, `console.log("main start")` is called and pushed onto the call stack:

   ```js showLineNumbers {8}
   "use strict"

   function work() {
     console.log("do work")
   }

   function main() {
     console.log("main start")
     work()
     console.log("main end")
   }

   main()
   ```

   ![Call stack states 4-6: main, work above main, then console above both](../_assets/nodejs-event-loop/call-stack/2.png)

4. `console.log` executes, prints `main start` and is popped off the call stack.

5. `main` continues executing and calls `work()`, which is pushed onto the call stack:

   ```js showLineNumbers {9}
   "use strict"

   function work() {
     console.log("do work")
   }

   function main() {
     console.log("main start")
     work()
     console.log("main end")
   }

   main()
   ```

6. While executing `work`, `console.log("do work")` is called and pushed onto the call stack:

   ```js showLineNumbers {4}
   "use strict"

   function work() {
     console.log("do work")
   }

   function main() {
     console.log("main start")
     work()
     console.log("main end")
   }

   main()
   ```

   ![Call stack states 7-9: work above main, main, then console above main](../_assets/nodejs-event-loop/call-stack/3.png)

7. `console.log` executes, prints `do work` and is popped off the call stack.

8. `work` finishes executing and is popped off the call stack.

9. `main` continues executing and calls `console.log("main end")`, which is pushed onto the call stack:

   ```js showLineNumbers {10}
   "use strict"

   function work() {
     console.log("do work")
   }

   function main() {
     console.log("main start")
     work()
     console.log("main end")
   }

   main()
   ```

   ![Call stack states 10-11: main, then an empty stack](../_assets/nodejs-event-loop/call-stack/4.png)

10. `console.log` executes, prints `main end` and is popped off the call stack.

11. `main` finishes executing and is popped off the call stack. The call stack is empty again and the script finishes executing.

This code didn't interact with any asynchronous (internal) APIs.
But when it does (like when calling `setTimeout(callback)`) it makes use of the task queue.

### Task queue

In this simplified model, asynchronous work in the runtime is represented as a task in a queue. Or in other words, a _message queue_.

Each message can be thought of as a function that will be called in <abbr title="First In First Out">FIFO</abbr> order to handle said work.
For example, the callback provided to `setTimeout`, once its delay has elapsed.

![Task queue processes tasks in first-in, first-out order](../_assets/nodejs-event-loop/queue.png)

Additionally, each message is processed _completely_ before any other message is processed.
This means that **whenever a function runs it can't be interrupted**.
This behavior is called _run-to-completion_ and makes it easier to reason about our JavaScript programs.

Messages get _enqueued_ (i.e. added to the queue) and at some point messages will be _dequeued_ (i.e. removed from the queue).

When? How? This is handled by the event loop.

### Event loop

The event loop can be thought of as a loop, where every cycle is referred to as a _tick_.
The event loop checks if there's any work ready to run.
If there is, it executes the corresponding callback, **but only if the call stack is empty**.

A simplified event loop can be described with the following pseudo code[^1]:

[^1]: Adapted from [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model#job_queue_and_event_loop).

```js
while (queue.waitForMessage()) {
  queue.processNextMessage()
}
```

To summarize:

- When code executes, function calls are added to the call stack.
- Calls to asynchronous APIs like `setTimeout` register work whose callbacks can run later.
- When the call stack is empty, ready callbacks can be pushed onto the call stack and executed. Node.js may process several callbacks in one tick.

> [!warning]
>
> `new Promise(callback)` runs its callback (called the _executor_) immediately.
> It's the handlers passed to `.then()` that run later.
> See the [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise) docs for more information.

![Event loop moves queued tasks to an empty call stack](../_assets/nodejs-event-loop/event-loop.png)

With that covered, we can explore how the AWS Lambda execution environment interacts with the Node.js event loop.

## AWS Lambda

AWS Lambda invokes a Lambda function via an exported handler function, e.g. `exports.handler`.
For callback-based handlers, Lambda calls it with 3 arguments:

```js
handler(event, context, callback)
```

The `callback` argument may be used to return information to the caller and to signal that the handler function has completed, so Lambda may end it.
Our handler is `async`, so we don't call `callback` ourselves.
Lambda uses the handler's returned promise to determine when it has finished[^2].

[^2]: See the AWS [handler](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html#nodejs-handler-patterns) docs for the callback and async handler patterns.

### Baseline

From here on we'll use a simple script as a "baseline" to reason about the event loop behavior.
Create a file called `timeout.js` with the following contents:

```js title="timeout.js" showLineNumbers
"use strict"

function timeout(ms) {
  console.log("timeout start")

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`timeout cb fired after ${ms} ms`)
      resolve()
    }, ms)
  })
}

async function main() {
  console.log("main start")
  timeout(5e3)
  console.log("main end")
}

main()
```

When we execute this script _locally_ (not via Lambda) with `node timeout.js`, the following will print:

```sh title="node timeout.js output"
main start
timeout start
main end
timeout cb fired after 5000 ms
```

The last message takes ~5 seconds to print, but the script does _not_ stop executing before it does.
The timer keeps the Node.js process alive, even though `main` has returned.

### What happens in Lambda, stays in Lambda

Now let's modify the code from `timeout.js` so it's compatible with Lambda:

```js title="timeout.js" showLineNumbers {20}
"use strict"

function timeout(ms) {
  console.log("timeout start")

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`timeout cb fired after ${ms} ms`)
      resolve()
    }, ms)
  })
}

async function main() {
  console.log("main start")
  timeout(5e3)
  console.log("main end")
}

exports.handler = main
```

You can create a new function in the AWS Lambda console and paste in the code from above.
Use a CommonJS file called `timeout.js`, configure the handler as `timeout.handler`, and give the function a timeout longer than five seconds.
Run it, sit back and enjoy.

![First Lambda invocation ends before the timeout callback runs](../_assets/nodejs-event-loop/console/1.png)

Wait, what? Lambda just ended the handler function _without_ printing the last message `timeout cb fired after 5000 ms`.
Let's run it again.

![Second Lambda invocation runs the previous timeout callback first](../_assets/nodejs-event-loop/console/2.png)

It now prints `timeout cb fired after 5000 ms` _first_ and then the other ones!
So what's going on here?

### AWS Lambda execution model

AWS Lambda takes care of provisioning and managing resources needed to run your functions.
When a new execution context is needed, Lambda creates one for you based on the configuration you provide.
The execution context is a temporary runtime environment that initializes any external dependencies of your Lambda function.

After a Lambda function is called, Lambda maintains the execution context for some time in anticipation of another invocation of the Lambda function (for performance benefits).
It freezes the execution context after a Lambda function completes and may choose to reuse (thaw) the same execution context when the Lambda function is called again (but it doesn't have to).

Our handler returns a promise because it's an `async` function.
Lambda can complete the invocation when that promise settles.
Calling `timeout(5e3)` creates a separate promise, which `main` ignores.
Since `main` doesn't await it, the handler can finish before the timer fires.

The [`callbackWaitsForEmptyEventLoop`](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html) setting controls callback-based completion;
it doesn't make this async handler wait for the ignored promise.

Okay, so with this information we can make sense of what happened when we executed the code in `timeout.js` before.
Let's break it down and go over it step by step.

![State 1: empty call stack and task queue](../_assets/nodejs-event-loop/lambda/1.png)

1. Lambda starts executing the code in `timeout.js`. The call stack is empty.

   ![State 2: main is pushed onto the call stack](../_assets/nodejs-event-loop/lambda/2.png)

2. `main` is called and pushed onto the call stack:

   ```js title="timeout.js" showLineNumbers {20}
   "use strict"

   function timeout(ms) {
     console.log("timeout start")

     return new Promise((resolve) => {
       setTimeout(() => {
         console.log(`timeout cb fired after ${ms} ms`)
         resolve()
       }, ms)
     })
   }

   async function main() {
     console.log("main start")
     timeout(5e3)
     console.log("main end")
   }

   exports.handler = main
   ```

   ![State 3: console is pushed above main](../_assets/nodejs-event-loop/lambda/3.png)

3. While executing `main`, `console.log("main start")` is called and pushed onto the call stack:

   ```js title="timeout.js" showLineNumbers {15}
   "use strict"

   function timeout(ms) {
     console.log("timeout start")

     return new Promise((resolve) => {
       setTimeout(() => {
         console.log(`timeout cb fired after ${ms} ms`)
         resolve()
       }, ms)
     })
   }

   async function main() {
     console.log("main start")
     timeout(5e3)
     console.log("main end")
   }

   exports.handler = main
   ```

   ![State 4: console is popped, leaving main](../_assets/nodejs-event-loop/lambda/4.png)

4. `console.log` executes, prints `main start` and is popped off the call stack.

   ![State 5: timeout is pushed above main](../_assets/nodejs-event-loop/lambda/5.png)

5. `main` continues executing and calls `timeout(5e3)`, which is pushed onto the call stack:

   ```js title="timeout.js" showLineNumbers {16}
   "use strict"

   function timeout(ms) {
     console.log("timeout start")

     return new Promise((resolve) => {
       setTimeout(() => {
         console.log(`timeout cb fired after ${ms} ms`)
         resolve()
       }, ms)
     })
   }

   async function main() {
     console.log("main start")
     timeout(5e3)
     console.log("main end")
   }

   exports.handler = main
   ```

   ![State 6: console is pushed above timeout and main](../_assets/nodejs-event-loop/lambda/6.png)

6. While executing `timeout`, `console.log("timeout start")` is called and pushed onto the call stack:

   ```js title="timeout.js" showLineNumbers {4}
   "use strict"

   function timeout(ms) {
     console.log("timeout start")

     return new Promise((resolve) => {
       setTimeout(() => {
         console.log(`timeout cb fired after ${ms} ms`)
         resolve()
       }, ms)
     })
   }

   async function main() {
     console.log("main start")
     timeout(5e3)
     console.log("main end")
   }

   exports.handler = main
   ```

   ![State 7: console is popped, leaving timeout and main](../_assets/nodejs-event-loop/lambda/7.png)

7. `console.log` executes, prints `timeout start` and is popped off the call stack.

   ![State 8: the Promise constructor immediately calls the executor](../_assets/nodejs-event-loop/lambda/8.png)

8. `timeout` continues executing and invokes the `Promise` constructor on line 6. The constructor immediately calls the executor (i.e. the callback), which is pushed onto the call stack:

   ```js title="timeout.js" showLineNumbers /new Promise/
   "use strict"

   function timeout(ms) {
     console.log("timeout start")

     return new Promise((resolve) => {
       setTimeout(() => {
         console.log(`timeout cb fired after ${ms} ms`)
         resolve()
       }, ms)
     })
   }

   async function main() {
     console.log("main start")
     timeout(5e3)
     console.log("main end")
   }

   exports.handler = main
   ```

   ![State 9: the executor calls setTimeout and registers the timer](../_assets/nodejs-event-loop/lambda/9.png)

9. The executor calls `setTimeout` on line 7, which registers the timer and its callback. After the delay, the timer callback can run when the call stack is empty:

   ```js title="timeout.js" showLineNumbers /setTimeout/
   "use strict"

   function timeout(ms) {
     console.log("timeout start")

     return new Promise((resolve) => {
       setTimeout(() => {
         console.log(`timeout cb fired after ${ms} ms`)
         resolve()
       }, ms)
     })
   }

   async function main() {
     console.log("main start")
     timeout(5e3)
     console.log("main end")
   }

   exports.handler = main
   ```

   ![State 10: timeout returns a pending promise to main while the timer remains registered](../_assets/nodejs-event-loop/lambda/10.png)

10. `setTimeout` returns, then the executor returns. The constructor returns a pending promise, and `timeout` returns that promise to `main`. Only `main` remains on the call stack. It ignores the returned promise and continues immediately.

    ![State 11: console is pushed above main while the timer remains registered](../_assets/nodejs-event-loop/lambda/11.png)

11. `main` continues executing and calls `console.log("main end")`:

    ```js title="timeout.js" showLineNumbers {17}
    "use strict"

    function timeout(ms) {
      console.log("timeout start")

      return new Promise((resolve) => {
        setTimeout(() => {
          console.log(`timeout cb fired after ${ms} ms`)
          resolve()
        }, ms)
      })
    }

    async function main() {
      console.log("main start")
      timeout(5e3)
      console.log("main end")
    }

    exports.handler = main
    ```

    ![State 12: main has returned, its promise is fulfilled, and the timer promise is still pending](../_assets/nodejs-event-loop/lambda/12.png)

12. `console.log` prints `main end` and is popped off the call stack. Then `main` finishes executing and is popped off too. Its returned promise is fulfilled, while the promise returned by `timeout` is still pending.

At this point the call stack is empty and the timer callback isn't ready yet.
The timer would keep a local Node.js process alive, but Lambda can complete this invocation because the handler's returned promise has fulfilled.
So it can _freeze_ the process and return results to the caller!

The interesting part here is that Lambda doesn't immediately destroy its execution context.
In my experiment, waiting for +5 seconds and running the Lambda again (like in the [[#What happens in Lambda, stays in Lambda|second run]]) printed the `setTimeout` callback's message first.

The execution context was still around, but JavaScript wasn't running while it was frozen.
When Lambda reused it, the timer's delay had already elapsed, so its callback was ready to run:

![Resumed execution context: the overdue timer callback is ready to run](../_assets/nodejs-event-loop/lambda/exec-context-1.png)

The event loop could then push the callback onto the call stack:

![Thawed execution context: the timeout callback moves onto the call stack](../_assets/nodejs-event-loop/lambda/exec-context-2.png)

This resulted in `timeout cb fired after 5000 ms` being printed first, because in this run it executed before any of the code in our Lambda handler:

![Reused execution context: console runs above the previous timeout callback](../_assets/nodejs-event-loop/lambda/exec-context-3.png)

Neither reuse nor this ordering is guaranteed.
If Lambda discards the environment, that unfinished callback never runs.
See the AWS [Lambda runtime environment](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html) docs for more information.

### Doing it right

Obviously this is undesired behavior and you should _not_ write your code in the same way we wrote the code in `timeout.js`.

Like stated in the AWS docs, we need to make sure to complete processing _all_ callbacks before our handler exits:

> [!quote]
>
> Make sure that any background processes or callbacks in your code are complete before the code exits.
>
> [https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)

Therefore we'll make the following change to the code in `timeout.js`:

```diff
- timeout(5e3);
+ await timeout(5e3);
```

This change makes sure the handler function does _not_ finish until the promise returned by `timeout` fulfills.
The `timeout` function itself still returns immediately. But `await` makes `main` wait for the timer callback to call `resolve()`:

```js title="timeout.js" showLineNumbers {16}
"use strict"

function timeout(ms) {
  console.log("timeout start")

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`timeout cb fired after ${ms} ms`)
      resolve()
    }, ms)
  })
}

async function main() {
  console.log("main start")
  await timeout(5e3)
  console.log("main end")
}

exports.handler = main
```

When we run our code with this change, all is well now.

![Lambda invocation waits for the awaited timeout callback](../_assets/nodejs-event-loop/console/3.png)

## Macrotasks and microtasks

I intentionally left out some details about the task queue.
There are actually several queues.
For example, one for macrotasks (e.g. `setTimeout` callbacks) and one for microtasks (e.g. `Promise` handlers like `.then()`).

Node.js processes the microtask queue before moving on to the next event loop callback.
While these microtasks are processed they can enqueue more microtasks, **which will also be processed before moving on**.

For more information see this [RisingStack article](https://blog.risingstack.com/node-js-at-scale-understanding-node-js-event-loop/) where they go into more detail.

> [!note]
>
> This page was originally published on [Medium](https://medium.com/radient-tech-blog/aws-lambda-and-the-node-js-event-loop-864e48fba49).
