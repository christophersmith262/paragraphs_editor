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
      "widgetContext": "",

      /**
       * The data to be sent with the command.
       *
       * @type {string}
       */
      "markup": "",

      /**
       * The data to be sent with the command.
       *
       * @type {object}
       */
      "edits": {},

      "duplicating": false,
    },

    set: function(attributes, options) {
      this._refreshEmbedCode(attributes);

      var widgetModel = this;
      if (attributes.edits) {
        _.each(attributes.edits, function(item) {
          widgetModel.embedCodeFactory.getContextFactory().touch(item.context);
        });
      }

      return Backbone.Model.prototype.set.call(this, attributes, options);
    },

    edit: function() {
      this.embedCode.getCommandEmitter().edit(this.get('widgetContext'), this.get('itemId'));
      return this;
    },

    duplicate: function() {
      this.set({ duplicating: true });
      this.embedCode.getCommandEmitter().duplicate(this.get('widgetContext'), this.get('itemContext'), this.get('itemId'), this.get('id'));
        
      return this;
    },

    destroy: function(options) {
      this.trigger('destroy', this, this.collection, options);
    },

    _refreshEmbedCode: function(attributes) {
      var oldItemContext = this.get('itemContext');
      var oldWidgetContext = this.get('widgetContext');
      var oldItemId = this.get('itemId');
      var newItemContext = attributes.itemContext ? attributes.itemContext : oldItemContext;
      var newWidgetContext = attributes.widgetContext ? attributes.widgetContext : oldWidgetContext;
      var newItemId = attributes.itemId ? attributes.itemId : oldItemId;

      if (newItemContext != oldItemContext || newWidgetContext != oldWidgetContext || newItemId != oldItemId) {
        this.embedCode = this.embedCodeFactory.createFromRefs(newItemId, newItemContext, newWidgetContext);
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
