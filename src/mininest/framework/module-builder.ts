import { Container } from './container.ts';
import { MetadataKeys } from './metadata.ts';
import { ModuleMetadata, ProviderInput, Token, Constructor } from './types.ts';

export class ModuleRef {
  public readonly imports: ModuleRef[] = [];
  public readonly exports = new Set<Token>();

  constructor(
    public readonly metatype: Constructor,
    public readonly metadata: ModuleMetadata,
    public readonly container: Container,
  ) {}
}

export interface ControllerRef {
  metatype: Constructor;
  container: Container;
  module: ModuleRef;
}

export class ModuleBuilder {
  private readonly moduleRefs = new Map<Constructor, ModuleRef>();

  constructor(private readonly rootContainer: Container = new Container()) {}

  build(moduleClass: Constructor): ModuleRef {
    return this.loadModule(moduleClass, this.rootContainer);
  }

  private loadModule(moduleClass: Constructor, parentContainer: Container): ModuleRef {
    if (this.moduleRefs.has(moduleClass)) {
      return this.moduleRefs.get(moduleClass)!;
    }

    const metadata: ModuleMetadata | undefined = Reflect.getMetadata(
      MetadataKeys.MODULE,
      moduleClass,
    );
    if (!metadata) {
      throw new Error(`Module ${moduleClass.name} lacks @Module metadata`);
    }

    const container = new Container(parentContainer);
    const moduleRef = new ModuleRef(moduleClass, metadata, container);
    this.moduleRefs.set(moduleClass, moduleRef);

    this.registerProvider(container, moduleClass);
    metadata.providers?.forEach((provider) => this.registerProvider(container, provider));
    metadata.controllers?.forEach((controller) => this.registerProvider(container, controller));

    const imports = (metadata.imports ?? []).map((importedModule) =>
      this.loadModule(importedModule, container),
    );
    moduleRef.imports.push(...imports);

    imports.forEach((importedRef) => {
      importedRef.exports.forEach((token) => {
        container.registerProxy(token, importedRef.container);
      });
    });

    const exportTokens = metadata.exports ?? [];
    exportTokens.forEach((token) => moduleRef.exports.add(token));

    return moduleRef;
  }

  private registerProvider(container: Container, provider: ProviderInput) {
    container.register(provider);
  }
}

export function collectControllers(
  moduleRef: ModuleRef,
  visited: Set<ModuleRef> = new Set(),
): ControllerRef[] {
  if (visited.has(moduleRef)) {
    return [];
  }
  visited.add(moduleRef);

  const controllers =
    moduleRef.metadata.controllers?.map((ctrl) => ({
      metatype: ctrl,
      container: moduleRef.container,
      module: moduleRef,
    })) ?? [];

  const nested = moduleRef.imports.flatMap((imported) => collectControllers(imported, visited));
  return [...controllers, ...nested];
}
