export type StrapiBlock = {
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
