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

## Motivation

While there are many [inversion of control](https://martinfowler.com/articles/dipInTheWild.html) libraries out there, many as part of a dedicated framework. These usually have their own approach to solve the registration process, most of them using decorators and module registration.

Standalone libraries often do not have the luxury of deeply integrated construction methods provided by frameworks. Therefore the program often needs to be built around the library, rather than integrating the library into the program. This is noticable due to the complexity of the registration process where most libaries choose to have individual methods, allowing to bind each dependency to its injectable value.

## Usage

A *container* represent a flat object consisting of key to injectable pairs. The injectable value can be any static object or a factory constructing the object based on a single parameter.

```ts
type ServiceProvider = {
    // A constant value initialized upon construction.
    config: Config;
    // Dynamically create services via a parameter.
    cache: (namespace: string) => Cache;
    // The root service that is invoked via the scope.
    user: UserService;
}
```

Constructing a container involves the usage of factory functions that are enriched by the use of a decorator service.

```ts
const services = inject<ServiceProvider>({
    // A static factory can return virtually any object to be used later.
    // This object can be transparently used with the `container` property from the factories' context.
    // All factories must be annotated by the decorator to ensure proper type hints.
	config: ({ decorator }) => {
        // Although this is a plain object, it still needs to be wrapped within the factory to ensure proper initiation order.
		return decorator.invoke(() => {
			return {
				cache: {
					namespace: "application",
				},
				token: process.env.JWT_TOKEN,
			};
		});
	},

    // Using the container to access the static resolvable values (allowing for nested destructuring).
    // This is done by invoking the function twice, therefore you should move all expensive code within the decorated factory:
    //   1. Discover the accessed properties from the container within the immediate context.
    //   2. Initializing the services asynchronously and finally invoking the factory.
	cache: ({ decorator, container: { config: { cache } } }) => {
        // A dynamic factory will have its arguments proxied to the factory, accepting multiple arguments if necessary..
		return decorator.invoke((namespace) => {
			return new Cache(`${cache.namespace)}:${namespace}`);
		});
	},

    // Dynamic factories need to be invoked via the scope to allow to pass their arguments.
    // While the scope can be accessed within the decorated factory the following principles should be adhered to:
    //   1. Move all expensive calculation within the decorated factory.
    //   2. Ensure that all required services have been accessed outside of the decorated factory via the container.
	user: ({ decorator, container: { config }, scope: { cache } }) => {
        // While the config has already been initialized here, the cache will only be initialized when the factory is called.
		return decorator.invoke(async () => {
			return new UserService({
				cache: await cache("users"),
				token: config.token,
			});
		});
	},
});
```
