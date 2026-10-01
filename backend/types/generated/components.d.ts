import type { Schema, Struct } from '@strapi/strapi';

export interface ComponentConsentComponent extends Struct.ComponentSchema {
  collectionName: 'components_component_consent_components';
  info: {
    displayName: 'consentComponent';
    icon: 'bold';
  };
  attributes: {
    acceptButton: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'Statistik erlauben'>;
    content: Schema.Attribute.Blocks & Schema.Attribute.Required;
    denyButton: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'Nein, danke'>;
  };
}

export interface ComponentImagelink extends Struct.ComponentSchema {
  collectionName: 'components_component_imagelinks';
  info: {
    displayName: 'imagelink';
    icon: 'cast';
  };
  attributes: {
    image: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    link: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface ComponentLandscapeScreenComponent
  extends Struct.ComponentSchema {
  collectionName: 'components_component_landscape_screen_components';
  info: {
    displayName: 'landscapeScreenComponent';
    icon: 'refresh';
  };
  attributes: {
    content: Schema.Attribute.Blocks;
    image: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
  };
}

export interface ComponentLevelMaskotOffset extends Struct.ComponentSchema {
  collectionName: 'components_component_level_maskot_offsets';
  info: {
    displayName: 'levelMaskotTransforms';
    icon: 'alien';
  };
  attributes: {
    level: Schema.Attribute.Relation<'oneToOne', 'api::level.level'>;
    offset: Schema.Attribute.Component<'math.vector2', false> &
      Schema.Attribute.Required;
    preview: Schema.Attribute.String &
      Schema.Attribute.Private &
      Schema.Attribute.CustomField<'global::level-name-preview'>;
    scale: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
  };
}

export interface ComponentLinkComponent extends Struct.ComponentSchema {
  collectionName: 'components_component_link_components';
  info: {
    displayName: 'LinkComponent';
    icon: 'attachment';
  };
  attributes: {
    link: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface ComponentShareComponent extends Struct.ComponentSchema {
  collectionName: 'components_component_share_components';
  info: {
    displayName: 'shareComponent';
    icon: 'bold';
  };
  attributes: {
    shareContent: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Berlin braucht mehr Schwammstadt-Power. Probiers aus: [[LINK]]'>;
    shareCTA: Schema.Attribute.Blocks;
    shareFallbackImage: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
  };
}

export interface LayoutDefaultPage extends Struct.ComponentSchema {
  collectionName: 'components_layout_default_pages';
  info: {
    displayName: 'DefaultPage';
    icon: 'bold';
  };
  attributes: {
    content: Schema.Attribute.Blocks & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface MathVector2 extends Struct.ComponentSchema {
  collectionName: 'components_math_vector2s';
  info: {
    displayName: 'vector2';
    icon: 'code';
  };
  attributes: {
    x: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<0>;
    y: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<0>;
  };
}

export interface ObjectAnswer extends Struct.ComponentSchema {
  collectionName: 'components_object_answers';
  info: {
    displayName: 'Answer';
    icon: 'bold';
  };
  attributes: {
    content: Schema.Attribute.Blocks & Schema.Attribute.Required;
    correctAnswer: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    preview: Schema.Attribute.String &
      Schema.Attribute.Private &
      Schema.Attribute.CustomField<'global::blocks-preview'>;
  };
}

export interface ObjectEndAnimation extends Struct.ComponentSchema {
  collectionName: 'components_object_end_animations';
  info: {
    displayName: 'endAnimation';
    icon: 'chartBubble';
  };
  attributes: {
    uniqueId: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ObjectMaskottchen extends Struct.ComponentSchema {
  collectionName: 'components_object_maskottchens';
  info: {
    displayName: 'maskottchen';
    icon: 'alien';
  };
  attributes: {
    happy: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    superhappy: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    unhappy: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
  };
}

export interface ObjectPunkte extends Struct.ComponentSchema {
  collectionName: 'components_object_punktes';
  info: {
    displayName: 'punkte';
    icon: 'apps';
  };
  attributes: {
    bio_bonus: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    bio_isBonus: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    climate_bonus: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    climate_isBonus: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    flood_prevention_bonus: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    flood_prevention_isBonus: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    green_spaces_bonus: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    green_spaces_isBonus: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    green_water_bonus: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    green_water_isBonus: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    water_protection_bonus: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    water_protection_isBonus: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
  };
}

export interface ObjectPuzzleItem extends Struct.ComponentSchema {
  collectionName: 'components_object_puzzle_items';
  info: {
    displayName: 'puzzleItem';
    icon: 'puzzle';
  };
  attributes: {
    content: Schema.Attribute.Blocks;
    kombiChild: Schema.Attribute.String &
      Schema.Attribute.CustomField<'global::puzzle-unique-id-ref'>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    punkte: Schema.Attribute.Component<'object.punkte', false> &
      Schema.Attribute.Required;
    uniqueId: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ObjectQuestion extends Struct.ComponentSchema {
  collectionName: 'components_object_questions';
  info: {
    displayName: 'Question';
    icon: 'question';
  };
  attributes: {
    answers: Schema.Attribute.Component<'object.answer', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    content: Schema.Attribute.Blocks & Schema.Attribute.Required;
  };
}

export interface ObjectSlideContent extends Struct.ComponentSchema {
  collectionName: 'components_object_slide_contents';
  info: {
    displayName: 'SlideContent';
    icon: 'chartBubble';
  };
  attributes: {
    content: Schema.Attribute.Blocks;
    image: Schema.Attribute.Media<'files' | 'images' | 'videos'> &
      Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'component.consent-component': ComponentConsentComponent;
      'component.imagelink': ComponentImagelink;
      'component.landscape-screen-component': ComponentLandscapeScreenComponent;
      'component.level-maskot-offset': ComponentLevelMaskotOffset;
      'component.link-component': ComponentLinkComponent;
      'component.share-component': ComponentShareComponent;
      'layout.default-page': LayoutDefaultPage;
      'math.vector2': MathVector2;
      'object.answer': ObjectAnswer;
      'object.end-animation': ObjectEndAnimation;
      'object.maskottchen': ObjectMaskottchen;
      'object.punkte': ObjectPunkte;
      'object.puzzle-item': ObjectPuzzleItem;
      'object.question': ObjectQuestion;
      'object.slide-content': ObjectSlideContent;
    }
  }
}
