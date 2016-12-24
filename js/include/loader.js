/**
 * @file
 * Provides Drupal API integrations for paragraphs_editor.
 */

(function ($, window, Drupal, drupalSettings) {

  Drupal.paragraphs_editor.loader = {

    validateSettings: function() {
      this._bootstrap();
      return !!this._globalSettings['instances'];
    },

    getContextFactory: function() {
      return this._initialize() ? this._contextFactory : null;
    },

    getEmbedCodeFactory: function() {
      return this._initialize() ? this._embedCodeFactory : null;
    },

    wrapElement: function($el) {
      if (this._initialize()) {
        var editorContext = this._createContextResolver().resolveTargetContext($el);
        var contextResolver = this._createContextResolver(editorContext);
        var commandEmitter = new this._prototypes.EditorCommandEmitter(editorContext);
        var embedCodeFactory = new this._prototypes.EmbedCodeFactory(this._contextFactory, commandEmitter, this._globalSettings.elements, this._prototypes);
        return editorContext ? new this._prototypes.ParagraphsEditorField(contextResolver, editorContext, embedCodeFactory, this._prototypes) : null;
      }
      return null;
    },

    _initialized: false,

    _initialize: function() {
      this._bootstrap();

      if (!this._initialized && this.validateSettings()) {
        this._contextFactory = new this._prototypes.ContextFactory(this._globalSettings, this._prototypes);
        this._embedCodeFactory = new this._prototypes.EmbedCodeFactory(this._contextFactory, null, this._globalSettings.elements, this._prototypes);
        this._initialized = true;
      }

      return this._initialized;
    },

    _bootstrap: function() {
      if (!this._prototypes) {
        this._prototypes = Drupal.paragraphs_editor;

        if (drupalSettings['paragraphs_editor']) {
          this._globalSettings = drupalSettings['paragraphs_editor'];
        }

        this._globalSettings.elements = {
          context_attribute: 'data-paragraphs-editor-context',
          editor_class: 'paragraphs-editor',
          embed_template: {
            tag: 'paragraphs-editor-paragraph',
            attributes: {
              uuid: 'data-paragraph-uuid',
              context: 'data-context-hint',
            }
          },
          inline_template: {
            tag: 'paragraphs-editor-nested-editor',
          }
        };
      }
    },

    _createContextResolver: function(editorContext) {
      var sourceContextAttribute = this._globalSettings.elements.embed_template.attributes.context;
      var targetContextAttribute = this._globalSettings.elements.context_attribute;
      return new Drupal.paragraphs_editor.ContextResolver(this._contextFactory, sourceContextAttribute, targetContextAttribute, editorContext);
    }

  };

})(jQuery, window, Drupal, drupalSettings);
