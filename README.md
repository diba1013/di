# @diba1013/di

A small dependency injection library using constructor injection and asynchronous services.

## Installation

Add github as npm registry within `.npmrc`:

```bash
@diba1013:registry=https://npm.pkg.github.com
```

Then, add the dependency with the following command:

```
npm add @diba1013/di
```

## Usage

There are essentially two type of *injectables*:

1. *Constants* for static accessors (e.g. configuration or nested containers) of and
2. *Services* for objects containing (only) asynchronous functions.

An injectable can consume other injectables from the same container.

### Container

A *container* represent a flat object consisting of key to injectable pairs. They proxy the property to a injectable, which is constructed lazily through a factory. This even allows for containers being nested for deep property access, however, the nested containers can only access their scope and need to be provided external dependencies.

```ts
type ServiceProvider = {
    config: Config;
    auth: AuthorizationService;
    user: UserService;
}
```

Constructing a container can be done in different ways. Each property is created lazily, thus they have to be wrapped within a function. These functions must not be async and always return the specified type. However, a `decorator` can be used for asynchronous wrapping and proxy referral.

Additionally, you can reference the container via destructuring and extract necessary dependencies. Since the services are created on demand while being referenced, it is advisable to always use the decorator as to only proxy these services and thus only construct them once a method is called.

```ts
const container = inject<ServiceProvider>({
    // Plain factory for static configuration, does not support async
    config: () => {
        return {
            token: process.env.API_TOKEN
        }
    },

    // Use decorator for async functions (constants or service)
    api: (decorator, {container: {config}}) => {
        return decorator.factory(async () => {
            return new AuthorizationService(config.token)
        });
    },

    // Use decorator for automatic service constructor injection
    user: ({decorator}) => {
        return decorator.service(UserService);
    }
})
```

Containers may only access their own (nested) properties. Nested containers cannot access the properties of a parent. However, you may pass in injectables from the parent container such that the child services can be constructed correctly.

Nesting containers allow both grouping certain services together (e.g. `auth.user`, `auth.token`), but also to create dynamic services that depend on a string type. You may restrict these types by specifying type aliases accordingly. An example would be to create dynamic endpoints which map to an respective path.

```ts
const { api } = inject({
    api: ({ decorator, container: { endpoints } }) => {
        return decorator.nest(({ key: path }) => {
            return new ScopedEndpoint(endpoints[path]);
        });
    },
})

const result = api.users.get("me");
```

### Service

Constructing a service is usually done via a typed subset of a container. This allows for constructor injection with `decorator.service` and using object destructuring without needing to worry about the parameter ordering. If the service is created manually, you may add additional constructor parameters or extract services via destructuring from the container and pass them separately.

```ts
type UserServiceProvider = Pick<ServiceProvider, "api">;

class UserService {
    constructor({api}: UserServiceProvider) {
        this.$api = api;
    }

    user(id = "me"): Promise<User> {
        return this.$api.user(id);
    }
}
```

To avoid cyclic type dependencies, the types should be separated in different files, e.g. `di.types.ts` and `user.types.ts` with their implementations `di.service.ts` and `user.service.ts`.
