/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function (Backbone, Drupal, $) {

  'use strict';

  Drupal.paragraphs_editor.EmbedCodeFactory = function(contextFactory, elements, prototypes) {
    this._contextFactory = contextFactory;
    this._elements = elements;
    this._prototypes = prototypes;
  }

  $.extend(Drupal.paragraphs_editor.EmbedCodeFactory.prototype, {

    create: function(bufferItemModel, sourceContext, targetContext) {
      var fallbackContext = this._contextFactory.create(bufferItemModel.get('context'));

      if (!sourceContext) {
        sourceContext = fallbackContext;
      }

      if (!targetContext) {
        targetContext = fallbackContext;
      }

      return new this._prototypes.EmbedCode(bufferItemModel, sourceContext, targetContext, this._elements.embed_template);
    },

    createFromRefs: function(itemId, sourceContext, targetContext) {
      var sourceContext = this._contextFactory.create(sourceContext);
      var targetContext = this._contextFactory.create(targetContext);
      var bufferItemModel = sourceContext.getEditBuffer().getItem(itemId);
      return this.create(bufferItemModel, sourceContext, targetContext);
    },

    getTag: function() {
      return this._elements.embed_template.tag;
    },

    getAttributes: function(asArray) {
      if (asArray) {
        return $.map(this.getAttributes(), function(value) {
          return value;
        });
      }
      else {
        return this._elements.embed_template.attributes;
      }
    },

    getClose: function() {
      return this._elements.embed_template.close;
    }

  });

})(Backbone, Drupal, jQuery);
