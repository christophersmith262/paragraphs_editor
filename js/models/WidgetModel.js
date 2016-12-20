/**
 * @file
 * A Backbone model for representing paragraphs_editor paragraph widgets.
 */

(function (Backbone, Drupal) {

  'use strict';

  /**
   * Backbone  Model for representing paragraphs_editor paragraph widgets.
   *
   * @constructor
   *
   * @augments Backbone.Model
   */
  Drupal.paragraphs_editor.WidgetModel = Backbone.Model.extend({

    constructor: function (attributes, options) {
      this.embedCodeFactory = options.embedCodeFactory;
      this.widget = options.widget;
      Backbone.Model.apply(this, [attributes, options]);
    },

    /**
     * @type {object}
     *
     * @prop markup
     */
    defaults: /** @lends Drupal.paragraphs_editor.CommandModel# */{

      /**
       * The data to be sent with the command.
       *
       * @type {int}
       */
      "itemId": 0,

      /**
       * The context the buffer item is from.
       *
       * @type {string}
       */
      "itemContext": "",

      /**
       * The context the widget is in.
       *
       * @type {string}
       */
      "editorContext": "",

      /**
       * The data to be sent with the command.
       *
       * @type {string}
       */
      "markup": "...",

      /**
       * The data to be sent with the command.
       *
       * @type {object}
       */
      "edits": {},
    },

    set: function(attributes, options) {
      this._refreshEmbedCode(attributes);
      return Backbone.Model.prototype.set.call(this, attributes, options);
    },

    edit: function() {
      this.embedCode.getSourceContext()
        .getCommandEmitter()
        .edit(this.get('itemId'));
      return this;
    },

    duplicate: function() {
      var targetContextString = this.embedCode.getTargetContext().getContextString();
      this.embedCode.getSourceContext()
        .getCommandEmitter()
        .duplicate(this.get('itemId'), targetContextString, this.get('id'));
      return this;
    },

    destroy: function(options) {
      this.trigger('destroy', this, this.collection, options);
    },

    _refreshEmbedCode: function(attributes) {
      var oldItemContext = this.get('itemContext');
      var oldEditorContext = this.get('editorContext');
      var oldItemId = this.get('itemId');
      var newItemContext = attributes.itemContext ? attributes.itemContext : oldItemContext;
      var newEditorContext = attributes.editorContext ? attributes.editorContext : oldEditorContext;
      var newItemId = attributes.itemId ? attributes.itemId : oldItemId;

      if (newItemContext != oldItemContext || newEditorContext != oldEditorContext || newItemId != oldItemId) {
        this.embedCode = this.embedCodeFactory.createFromRefs(newItemId, newItemContext, newEditorContext);
        this.stopListening()
          .listenTo(this.embedCode.getBufferItem(), 'change:markup', this._readFromBufferItem);

        attributes.markup = this.embedCode.getBufferItem().get('markup');
      }
    },

    _readFromBufferItem(bufferItemModel) {
      this.set({markup: bufferItemModel.get('markup')});
    }

  });

}(Backbone, Drupal));
