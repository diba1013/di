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

While there are many [inversion of control](https://martinfowler.com/articles/dipInTheWild.html) libraries out there, they usually come pre-packaged as part of a dedicated framework. As such, they use a customized own approach to solve the registration process of dependencies, e.g. decorators or module registration.

Standalone libraries often do not have this luxury of deeply integrated construction methods provided by frameworks. Therefore the program often needs to be built around the library, rather than integrating the library into the program. This is noticeable by to the complexity of the registration process where most libraries choose to have individual methods, allowing to bind each dependency to its injectable value.

While this library does not try to solve all of these problems, especially notable implementation of frameworks, it tries to follow these principles:

1. Asynchronous injectable factories to make use of expensive setup construction (e.g. code splitting).
2. Transparent dependency declaration by normal usage of invocation functions by abstracting injectable construction.
3. Type-safety through inference so that types do not need to be explicitly defined for each factory.

## Usage

A *container* represent a flat object consisting of key to injectable pairs. The injectable value can be any static object or a factory constructing the object based on a single parameter.

* Services are only constructed once per argument invocation. For now, arguments are serialized via `JSON.stringify`.
* The typical usage reserves a limited amount of *root* services that then construct the remaining dependency tree, eliminating to pass the *scope* through many files.
* An injectable can technically be of any return type, though plain objects / classes are assumed; functions are interpreted as parameterized factories for the resulting injectable.

A root type declares the resulting *scope* with plain objects converted to async factory functions.

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

The resulting *scope* is used to instantiate the *root* services which then trigger the used injectables asynchronously.

```ts
// The invocation does not need to care about configuration or caching setup.
//   1. The config service is discovered through the use of the container.
//   2. The user factory function is called.
//   3. The cache service is triggered via the scope invocation (re-using the config singleton).
const users = await services.user();
// The service is returned as-is and can be used as if it were constructed manually.
const user = await users.fetch({
	id: 123,
});
```
