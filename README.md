[Japanese Version](./README_ja.md)

# What is this?

This is a web application framework made with TypeScript, React, and Zod. It focuses on the presentation layer as described in the three-tier architecture, covering both the frontend written in JSX and the backend layer (the surface of the server) that communicates with the frontend.

## Challenges and Solutions

Frameworks like Next.js and Vue.js mainly focus on the frontend. We believe this approach presents the following challenges:

- Often, non-essential tasks related to connecting with the backend (such as adjusting URLs for communication) arise.
- Using Server Side Rendering (SSR) necessitates a frontend server (BFF), complicating the system architecture.

To address these challenges, our framework takes responsibility "from the frontend to the entrance of the backend." This approach results in:

- Automatic generation of frontend communication code from server code, enabling communication through method calls on objects, thus eliminating the need for manual communication setup.
- No need for a BFF, as the framework includes backend components.

The backend is built following the philosophy of REST, defining Resources and their methods as the framework's responsibility. Since it's not a full-stack solution, you can choose any database or other components for implementing Resources.

# Features

- Designed to minimize differences between content rendered on the client and the server for SSR.
- Pages written in JSX can call Resource objects exposed by the server, similar to making Remote Procedure Calls (RPC) to the types of objects exposed by the server.
  - At runtime, this works as follows:
    - CSR: Calls the API through stubs of automatically generated Resource objects.
    - SSR: Directly calls Resource objects, performing database connections within the same process for efficient execution.
- Writing code for Routes and Resources automatically generates a lot of code, saving developers from writing repetitive, boring code. This process is completed using TypeScript's type information, avoiding the need for separate external formats like OpenAPI. For more details, see [Automatic Generation](#automatic-generation).
- URLs used in Pages are also automatically generated in a type-safe manner, following a policy of providing types wherever possible.

## Routes-driven development (RDD)

Since routing holds the most information in web systems, we recommend starting development from routing to maintain system consistency.

Multiple central Routing information is generated from a single Routes information:

- Server Routing information
- SPA Routing information for browsers
- Resource information available in REPL
- Endpoint information within the system

## Resource-View-Routes (RVR)

Our framework does not follow the MVC design pattern. Although MVC is a familiar and straightforward concept for many, our framework intentionally avoids using Controllers.

This is because Controllers, despite being files where one might want to write logic, are concepts that deal with web information. This conflict can lead to issues like the so-called Fat Controllers. To counter this, many people tend to delegate processing from Controllers to other classes.

In our system, Resources are somewhat similar to Controllers but do not carry web-related information, positioning them broadly as Models. These files can contain a lot of logic according to use cases. If necessary, developers can consider other concepts (similar to Models in MVC) for commonalities.

As a result, many functions traditionally handled by Controllers have been moved to Routes:

- Permission checks for access (Middleware)
- Validation of values sent from the client (Zod)
- Handling of Mass Assignment vulnerabilities (Zod)

### Routes

Routes are defined using a custom DSL, structuring the basic content around corresponding Resources.

While we introduce this below, some documentation may not be fully prepared, and specifications might be adjusted. For the latest usage examples, see [example/tasks](./example/tasks/universal/routes/).

#### Router.resources

The `resources` method defined in Router sets up endpoints to convey request information to Resources.

At this point, Zod's type information is assigned to each action, ensuring that only schema-validated data is handled by Resources. This means input validation is automated, ensuring only specified data is received by the server, enhancing robustness.

```ts
// Defines CRUD for a single Resource corresponding to the `/tasks` path.
r.resources('tasks', {
  name: 'tasks', // The name of the resource (TasksResource interface is automatically generated)
  actions: crud(), // Defines typical actions
  construct: {
    // Specifies Zod schemas to define accepted data
    create: { schema: taskCreateWithTagsSchema },
    update: { schema: taskUpdateWithTagsSchema },
  },
})
```

Taking the `tasks` resource as an example, the default routing would look like this, defined all at once by the `crud()` function:

| action | method    | path            | type | page | Main Purpose          |
| ------ | --------- | --------------- | ---- | ---- | --------------------- |
| index  | GET       | /tasks          |      | true | List view             |
| show   | GET       | /tasks/$id      |      | true | Detail view           |
| build  | GET       | /tasks/build    |      | true | New creation view     |
| edit   | GET       | /tasks/$id/edit |      | true | Edit view             |
| list   | GET       | /tasks.json     | json |      | Fetch list as JSON    |
| load   | GET       | /tasks/$id.json | json |      | Fetch details as JSON |
| create | POST      | /tasks/         |      |      | Create action         |
| update | PUT,PATCh | /tasks/$id      |      |      | Update action         |
| delete | DELETE    | /tasks/$id      |      |      | Delete action         |

For example, the edit action for `/tasks` would be `/tasks/$id/edit` (where `$id` is a placeholder).

Besides `crud()`, there's also an `api()` function, which only defines `list`, `load`, `create`, `update`, and `delete`.

Both `crud()` and `api()` can be filtered with common arguments:

```ts
crud({ only: ['index', 'load'] }) // Only defines index and load
api({ except: ['list', 'load'] }) // Defines create, update, delete, excluding list and load

crud('index', 'load') // Only defines index and load (syntax sugar for 'only')
```

Furthermore, actions can not only be the return values of utilities like `crud()` but also custom-defined. For example, you can add a custom action `done` like this:

```ts
r.resources({
  ...
  actions: [...crud(), { action: 'done', path: '$id/done', method: 'post', type: 'json' }],
  ...
})
```

#### Router.pages

This method is for creating pages unrelated to Resources.

```ts
r.pages('/', ['/', '/about']) // Defines routing for `/` and `/about`
```

#### Others

- scope: A utility for creating routing hierarchies (calls sub internally)
- layout: Defines layouts for ReactRouter
- sub: Creates a child Router

### Resource

Resources are based on the REST concept, allowing developers to freely create necessary methods. These methods can be called as actions from Routes.

- Automatic tests for Models are possible.
- Resources can be easily called from a REPL, making it simple to verify logic.
- Being broadly positioned as Models, it's fine to write a lot of

logic directly in them.

After defining Routes, running `npm run bistrio:gen` will automatically generate corresponding interfaces in `.bistrio/resources`. Using these types to implement actual Resources ensures smooth operation.

Create a directory matching the URL path hierarchy in `server/resources` and create a `resource.ts` file.

For example, the Resource for `/tasks` corresponds to the file `server/resources/tasks/resource.ts`. The content looks like this, with the utility function `defineResource` provided to assist in creation.

```ts
import { CustomActionOptions } from '@/server/customizers'
import { TasksResource } from '@bistrio/resources'

//...

export default defineResource(
  () =>
    ({
      // Create methods corresponding to each action name
      list: async (params): Promise<Paginated<Task>> => {
        return {
          //...
        }
      },

      load: async ({ id }): Promise<Task> => {
        // This is an example using prisma
        const task = await prisma.task.findUniqueOrThrow({ id })
        return task
      },

      // ...
      done: async ({ id }) => await prisma.task.update({ where: { id }, data: { done: true } }),
    }) as const satisfies TasksResource<CustomActionOptions>, // This specification makes the specific type available externally
)
```

For a more practical example, see [example/tasks/server/resources/tasks/resource.ts](example/tasks/server/resources/tasks/resource.ts).

When creating a Resource, keep the following points in mind:

- The `TaskResource` type is a generic type that can specify custom argument types. Specify types defined by the system, like `CustomActionOptions`.
- Add `as const satisfies TasksResource<CustomActionOptions>` to ensure the return of a specific type.

#### About `CustomActionOptions`

Processes like extracting user information from sessions are not performed within Resources. Since such processes are common across most parts of the system, they are handled before calling an action in `server/customizers/index.ts`'s `createActionOptions`. Customize this content according to your application.

You can implement using the `req` object from the `ctx` variable, which is derived from Express. This return value is set as an optional argument for each action in the resource, making it available within the action.

```ts
export type CustomActionOptions = {
  user?: User
  admin?: {
    id: number
    accessedAt: Date
  }
} & ActionOptions // It is also required to be of type ActionOptions

export const createActionOptions: CreateActionOptionFunction = (ctx) => {
  const customActionOptions: CustomActionOptions = buildActionOptions({ user: ctx.req.user as User })

  if (ctx.params.adminId) {
    // For example, if it's an admin, additional specific information is included
    customActionOptions.admin = {
      id: Number(ctx.params.adminId),
      accessedAt: new Date(),
    }
  }

  return customActionOptions
}
```

For example, if you add a `load` action to a Resource, it will be set as the second argument and available for use. If there are no arguments, only `CustomActionOptions` is set as the argument.

```ts
      load: async ({ id }, options: CustomActionOptions): Promise<Task> => {
        // You can write processing using options
      },
```

### View

Views are written in JSX. In this framework, server Resources can be manipulated through RenderSupport. With the introduction of Suspense in React 18, there's no need to write code heavily reliant on useEffect.

Views are conventionally called Pages in frontend JS.

Create a directory in `universal/pages` matching the URL path hierarchy and create files with matching names.

For example:

- `/about`: `universal/pages/about.tsx`
- `/` : `universal/pages/index.tsx` (index is a special name indicating `/`)
- `/test/mypage`: `universal/pages/test/mypage.tsx`

#### RenderSupport

When implementing a Page, you need to use data from the server. At this time, information is obtained through `RenderSupport`.

For instance, to call the `load` action of the tasks resource, you would write:

```ts
import { useRenderSupport } from '@bistrio/routes/main'

// ...

function Task({ id }: { id: number }) {
  const rs = useRenderSupport()
  const task = rs.suspendedResources().tasks.load({ id }) // Communicates to call the load action of tasks resource
  // rs.suspendedResources() retrieves stubs of resources adapted for Suspense.

  return <>{/* ... */}</>
}
```

- Use `useRenderSupport` placed in the automatically generated '@bistrio/routes/main' (the framework does not provide a fixed type).
- If not using Suspense, calling `rs.resources()` returns an implementation that gives a Promise.

# REPL

Running `npm run console` starts the REPL. You can call each resource via the global variable `resources`.

For example, you can test the `load` action of the tasks resource like this:

```terminal
$ npm run console

> tasks@0.0.0 console
> DEBUG=-bistrio:console NODE_ENV=development dotenv -e .env.development -- node --import ./dist/server/console.js

Welcome to Node.js v20.10.0.
Type ".help" for more information.
> await resources.tasks.load({id: 1})
{
  id: 1,
  title: 'Test1',
  description: 'Test1 Description',
  done: false,
  createdAt: 2023-12-23T05:45:07.584Z,
  updatedAt: 2024-01-28T07:57:17.471Z,
  tags: [ 'tag1', 'tag2' ]
}
>
```

# Automatic Generation

## SPA Routing and Server Routing

Since everything is automatically generated from common Routes, there's no need to worry about aligning multiple routings between the client and server.

## Stubs for Client Use

Automatically created from Routes and Resource information, there's no need to be concerned about generating stubs that match server-side code.

## Endpoint Information

Endpoint information used in hyperlinks, etc., is automatically generated from Routes, so following the types ensures no broken links.

# Directory Structure

The directory structure during development is as follows. For more details, check the example implementation provided in [example/tasks](example/tasks).

- .bistrio: Automatically generated code is placed here
- bin: Commands
- config: Configuration (usually not frequently modified)
- public: Static files published on the web
- server: Server-side code
  - config: Configuration
  - resources: Directory for placing Resources
  - middleware.ts: Implementation of Middleware called on the server
- universal: Common code for server and client (note: this is published to the browser)
  - config: Configuration
  - pages: Directory for placing JSX
  - routes: Directory for placing Routes
  - middleware.ts: Interface for Middleware used in routes
