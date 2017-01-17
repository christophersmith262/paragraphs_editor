/**
 * @file
 * A Backbone model for representing paragraphs_editor paragraph widgets.
 */

(function (Backbone, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.WidgetState = {
    READY: 0x01,
    DESTROYED_WIDGET: 0x02,
    DESTROYED_REFS: 0x04,
    DESTROYED: 0x06,
  }

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
      "itemContextId": "",

      /**
       * The context the widget is in.
       *
       * @type {string}
       */
      "widgetContextId": "",

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

      "state": Drupal.paragraphs_editor.WidgetState.READY,

      "attributes": {}
    },

    set: function(attributes, options) {
      if (this._refreshEmbedCode(attributes) || attributes.edits) {
        this._setupListeners(attributes);
      }
      return Backbone.Model.prototype.set.call(this, attributes, options);
    },

    edit: function() {
      this.embedCode.getCommandEmitter().edit(this.get('widgetContext'), this.get('itemId'), this.get('edits'));
      return this;
    },

    duplicate: function() {
      this.set({ duplicating: true });
      this.embedCode.getCommandEmitter().duplicate(this.get('widgetContext'), this.get('itemContext'), this.get('itemId'), this.get('id'));
        
      return this;
    },

    destroy: function(options) {
      if (!this.hasState(Drupal.paragraphs_editor.WidgetState.DESTROYED)) {
        this.trigger('destroy', this, this.collection, options);
        this.setState(Drupal.paragraphs_editor.WidgetState.DESTROYED);
      }
    },

    setState(state) {
      return this.set({state: this.get('state') | state});
    },

    hasState: function(state) {
      return (this.get('state') & state) == state;
    },

    _refreshEmbedCode: function(attributes) {
      var setupListeners = false;
      var oldItemContext = this.get('itemContext');
      var oldWidgetContext = this.get('widgetContext');
      var oldItemId = this.get('itemId');
      var newItemContext = attributes.itemContext ? attributes.itemContext : oldItemContext;
      var newWidgetContext = attributes.widgetContext ? attributes.widgetContext : oldWidgetContext;
      var newItemId = attributes.itemId ? attributes.itemId : oldItemId;

      if (newItemContext != oldItemContext || newWidgetContext != oldWidgetContext || newItemId != oldItemId) {
        this.embedCode = this.embedCodeFactory.createFromRefs(newItemId, newItemContext, newWidgetContext);
        setupListeners = true;
        attributes.markup = this.embedCode.getBufferItem().get('markup');
        attributes.attributes = this.embedCode.getAttributes();
      }

      return setupListeners;
    },

    _readFromBufferItem(bufferItemModel) {
      this.set({markup: bufferItemModel.get('markup')});
    },

    _updateContext(contextModel) {
      var oldId = contextModel.previous('id');
      var newId = contextModel.get('id');
      var attributes = {};

      // Update any context id references that may need to change.
      if (this.get('itemContextId') == oldId) {
        attributes.itemContextId = newId;
      }
      if (this.get('widgetContextId') == oldId) {
        attributes.widgetContextId = newId;
      }

      // If the context was referenced by an edit on the model, update the edit.
      var edits = this.get('edits');
      if (edits[oldId]) {
        attributes.edits = {};
        _.each(edits, function(value, contextString) {
          if (contextString == oldId) {
            attributes.edits[newId] = value.replace(oldId, newId);
          }
          else {
            attributes.edits[contextString] = value;
          }
        });
      }

      this.set(attributes, {silent: true});
    },

    _setupListeners: function(attributes) {
      this.stopListening()
        .listenTo(this.embedCode.getBufferItem(), 'change:markup', this._readFromBufferItem)
        .listenTo(this.embedCode.getSourceContext(), 'change:id', this._updateContext)
        .listenTo(this.embedCode.getTargetContext(), 'change:id', this._updateContext);

      var model = this;
      _.each(attributes.edits, function(value, contextString) {
        var context = model.embedCodeFactory.getContextFactory().create(contextString);
        model.listenTo(context, 'change:id', model._updateContext);
      });
    }

  });

}(Backbone, Drupal));
