const { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const backendRoot = path.resolve(__dirname, '..');
const defaultFrontendRoot = path.resolve(backendRoot, '..', 'frontend');

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${name}`);
  }

  return path.resolve(process.cwd(), value);
}

function shouldRun(flag) {
  return process.argv.includes(flag);
}

function runTypeGeneration() {
  const result = spawnSync('npx', ['strapi', 'ts:generate-types'], {
    cwd: backendRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error('Strapi type generation failed.');
  }
}

function getPublicNamespace(fileName) {
  if (fileName === 'contentTypes.d.ts') {
    return 'StrapiContentTypes';
  }

  if (fileName === 'components.d.ts') {
    return 'StrapiComponents';
  }

  const baseName = path.basename(fileName, '.d.ts').replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase());
  return `Strapi${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}`;
}

function rewriteGeneratedTypes(fileName, content) {
  const publicNamespace = getPublicNamespace(fileName);

  return content
    .replace(
      "import type { Schema, Struct } from '@strapi/strapi';",
      "import type { Schema, Struct } from '../schema';",
    )
    .replace(
      /declare module '@strapi\/strapi' \{\r?\n  export module Public \{/g,
      `export namespace ${publicNamespace} {`,
    )
    .replace(/\r?\n\}\s*$/, '\n');
}

function writeSchemaHelpers(strapiRoot) {
  const schemaPath = path.join(strapiRoot, 'schema.d.ts');
  const schemaContent = `export type StrapiBlock = {
  type: string;
  children?: StrapiBlock[];
  [key: string]: unknown;
};

export type StrapiMedia = {
  id: number;
  documentId?: string;
  url: string;
  name?: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  formats?: Record<string, unknown> | null;
  [key: string]: unknown;
};

type AttributeKind<TKind extends string, TValue> = {
  readonly __kind: TKind;
  readonly __value: TValue;
};

export namespace Struct {
  export interface BaseSchema {
    collectionName: string;
    info: Record<string, unknown>;
    attributes: Record<string, unknown>;
    options?: Record<string, unknown>;
    pluginOptions?: Record<string, unknown>;
  }

  export interface CollectionTypeSchema extends BaseSchema {}
  export interface SingleTypeSchema extends BaseSchema {}
  export interface ComponentSchema extends BaseSchema {}
}

export namespace Schema {
  export namespace Attribute {
    export type String = AttributeKind<'string', string>;
    export type Text = AttributeKind<'text', string>;
    export type RichText = AttributeKind<'richText', string>;
    export type Email = AttributeKind<'email', string>;
    export type Password = AttributeKind<'password', string>;
    export type Blocks = AttributeKind<'blocks', StrapiBlock[]>;
    export type Boolean = AttributeKind<'boolean', boolean>;
    export type Integer = AttributeKind<'integer', number>;
    export type BigInteger = AttributeKind<'bigInteger', number | string>;
    export type Float = AttributeKind<'float', number>;
    export type Decimal = AttributeKind<'decimal', number>;
    export type Date = AttributeKind<'date', string>;
    export type DateTime = AttributeKind<'dateTime', string>;
    export type Time = AttributeKind<'time', string>;
    export type Timestamp = AttributeKind<'timestamp', string>;
    export type JSON = AttributeKind<'json', unknown>;
    export type UID<TTarget extends string = string> = AttributeKind<'uid', string> & {
      readonly __target?: TTarget;
    };
    export type Enumeration<TValues extends readonly string[]> = AttributeKind<'enumeration', TValues[number]>;
    export type Media<TAllowed extends string = string> = AttributeKind<'media', StrapiMedia | StrapiMedia[] | null> & {
      readonly __allowedMedia?: TAllowed;
    };
    export type Component<TUID extends string, TRepeatable extends boolean = false> = AttributeKind<
      'component',
      TRepeatable extends true ? unknown[] : unknown
    > & {
      readonly __componentUid?: TUID;
      readonly __repeatable?: TRepeatable;
    };
    export type DynamicZone<TUIDs extends readonly string[]> = AttributeKind<'dynamicZone', unknown[]> & {
      readonly __componentUids?: TUIDs[number];
    };
    export type Relation<TRelation extends string = string, TTarget extends string = string> = AttributeKind<'relation', unknown> & {
      readonly __relation?: TRelation;
      readonly __target?: TTarget;
    };
    export type CustomField<TType extends string = string> = {
      readonly __customField?: TType;
    };

    export type Required = { readonly __required: true };
    export type Private = { readonly __private: true };
    export type Unique = { readonly __unique: true };
    export type DefaultTo<TValue> = { readonly __default: TValue };
    export type SetMinMax<TConfig> = { readonly __minMax?: TConfig };
    export type SetMinMaxLength<TConfig> = { readonly __minMaxLength?: TConfig };
    export type SetPluginOptions<TConfig> = { readonly __pluginOptions?: TConfig };

    export type Value<TAttribute> = TAttribute extends { readonly __value: infer TValue } ? TValue : unknown;

    export type Values<TAttributes extends Record<string, unknown>> = {
      [Key in keyof TAttributes as TAttributes[Key] extends Private ? never : Key]: TAttributes[Key] extends Required
        ? Value<TAttributes[Key]>
        : Value<TAttributes[Key]> | null;
    };
  }
}
`;

  writeFileSync(schemaPath, schemaContent);
}

function writeIndex(strapiRoot, generatedFiles) {
  const exports = [
    "export type { Schema, Struct, StrapiBlock, StrapiMedia } from './schema';",
    ...generatedFiles.map((fileName) => {
      const baseName = path.basename(fileName, '.d.ts');
      return `export type * from './generated/${baseName}';`;
    }),
    '',
  ].join('\n');

  writeFileSync(path.join(strapiRoot, 'index.ts'), exports);
}

function syncTypes() {
  const sourceDir = readOption('--source', path.join(backendRoot, 'types', 'generated'));
  const frontendRoot = readOption('--frontend', defaultFrontendRoot);
  const strapiRoot = readOption('--dest', path.join(frontendRoot, 'src', 'types', 'strapi'));
  const generatedDest = path.join(strapiRoot, 'generated');

  if (shouldRun('--generate')) {
    runTypeGeneration();
  }

  if (!existsSync(sourceDir)) {
    throw new Error(`Source directory does not exist: ${sourceDir}`);
  }

  mkdirSync(generatedDest, { recursive: true });

  for (const fileName of readdirSync(generatedDest)) {
    if (fileName.endsWith('.d.ts')) {
      rmSync(path.join(generatedDest, fileName));
    }
  }

  const generatedFiles = readdirSync(sourceDir)
    .filter((fileName) => fileName.endsWith('.d.ts'))
    .sort();

  if (generatedFiles.length === 0) {
    throw new Error(`No .d.ts files found in ${sourceDir}`);
  }

  for (const fileName of generatedFiles) {
    const sourcePath = path.join(sourceDir, fileName);
    const targetPath = path.join(generatedDest, fileName);
    const content = readFileSync(sourcePath, 'utf8');
    writeFileSync(targetPath, rewriteGeneratedTypes(fileName, content));
  }

  writeSchemaHelpers(strapiRoot);
  writeIndex(strapiRoot, generatedFiles);

  console.log(`Synced ${generatedFiles.length} Strapi type files to ${path.relative(process.cwd(), strapiRoot)}`);
}

try {
  syncTypes();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
